import { createServerFn } from '@tanstack/react-start'
import { consumeRateLimit, rateLimitError } from '@/lib/rate-limit'
import { createAdminClient } from '../../lib/supabase/admin'
import { getSupabaseServerClient } from '../utils/supabase'
import { getVerifiedUser } from './_auth'
import { findAvailableSlots } from './availability'
import { callLLM, type LLMMessage } from './llm'

export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

async function getClientId(supabase: ReturnType<typeof getSupabaseServerClient>) {
  const user = await getVerifiedUser(supabase)
  if (!user) return null
  const { data: client } = await supabase
    .from('clients')
    .select('id, salon_id')
    .eq('user_id', user.id)
    .maybeSingle()
  return client ? { clientId: client.id, salonId: client.salon_id } : null
}

export const sendChatMessageFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { message: string }) => d)
  .handler(async ({ data }) => {
    const message = (data.message ?? '').trim()
    if (!message) return { error: 'Wiadomość nie może być pusta' }
    if (message.length > 4000) {
      return { error: 'Wiadomość jest zbyt długa (maks. 4000 znaków)' }
    }

    const supabase = getSupabaseServerClient()
    const clientInfo = await getClientId(supabase)
    if (!clientInfo) return { error: 'Nie znaleziono profilu klienta' }

    const { clientId, salonId } = clientInfo

    const limit = consumeRateLimit(`chat:${clientId}`, 20, 5 * 60_000)
    if (!limit.ok) return { error: rateLimitError(limit).error }

    const admin = await createAdminClient()

    // Save user message
    const { error: saveUserError } = await admin.from('chat_messages').insert({
      salon_id: salonId,
      client_id: clientId,
      role: 'user',
      content: message,
    })
    if (saveUserError) console.error('Save user message error:', saveUserError.message)

    // Get conversation history
    const { data: history } = await admin
      .from('chat_messages')
      .select('role, content, tool_calls')
      .eq('client_id', clientId)
      .order('created_at', { ascending: true })
      .limit(50)

    const messages: LLMMessage[] =
      history?.map((m) => ({
        role: m.role as LLMMessage['role'],
        content: m.content || '',
        tool_calls: undefined,
        tool_call_id: undefined,
      })) || []

    const toolResults: Array<{ name: string; result: any }> = []

    // ----- Rule-based intent detection (fallback gdy AI nie woła narzędzi) -----
    const userMsg = data.message.toLowerCase()
    const treatmentIntent = /szukam|poleć|pokaż|co (macie|polecasz)|na (twarz|cerę|skórę)|mam (suchą|tłustą|problem|trądzik|zmarszczki)|potrzebuję|umów|zapis|chcę na|ile kosztuje|rezerwuj/.test(userMsg)

    if (treatmentIntent) {
      let txQuery = admin
        .from('treatments')
        .select('id, name, description, duration_minutes, price, salon_id, indications')
        .order('name')
        .limit(50)
      if (salonId) txQuery = txQuery.eq('salon_id', salonId)
      const { data: allTx } = await txQuery

      // Filter by relevance
      const searchWords = userMsg.replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 2)
      let matched = allTx || []
      if (searchWords.length > 0) {
        matched = matched.filter((t: any) => {
          const text = [t.name, t.description, ...(t.indications || [])].join(' ').toLowerCase()
          return searchWords.some((w: string) => text.includes(w))
        })
      }

      if (matched.length > 0) {
        const ctx = matched.map((t: any) => {
          return `- ${t.name} (id: ${t.id}, salon_id: ${t.salon_id}): ${t.description || ''} (${t.duration_minutes}min${t.price ? `, ${t.price}zł` : ''})`
        }).join('\n')
        messages.unshift({ role: 'system', content: `Znalezione zabiegi pasujące do zapytania:\n${ctx}\n\nPoleć je klientowi.` })
        toolResults.push({ name: 'searchTreatments', result: { treatments: matched } })
      }
    }

    // ----- End of rule-based detection -----

    // Main LLM loop
    const MAX_ITERATIONS = 5
    let iterations = 0

    try {
      while (iterations < MAX_ITERATIONS) {
        iterations++

        const response = await callLLM(messages)

        if (!response.toolCalls || response.toolCalls.length === 0) {
          // LLM finished - return final response
          const { error: saveAssistantError } = await admin.from('chat_messages').insert({
            salon_id: salonId,
            client_id: clientId,
            role: 'assistant',
            content: response.content,
            tool_calls: toolResults,
          })
          if (saveAssistantError) {
            console.error('Save assistant message error:', saveAssistantError.message)
          }

          return {
            message: response.content,
            tools: toolResults,
          }
        }

        // Process tool calls
        for (const tc of response.toolCalls) {
          const { name, arguments: argsStr } = tc.function
          let args: Record<string, unknown> = {}
          try {
            args = JSON.parse(argsStr)
          } catch {
            args = {}
          }

          let result: string

          try {
            const toolResult = await executeTool(name, args, { supabase, admin, clientId, salonId })
            result = JSON.stringify(toolResult)
            // Track for frontend rendering
            if (name === 'searchTreatments' || name === 'findAvailableSlots' || name === 'getRequiredForms' || name === 'bookAppointment') {
              if (name === 'findAvailableSlots') {
                toolResults.push({
                  name,
                  result: {
                    ...(toolResult as Record<string, unknown>),
                    treatmentId: (args.treatmentId as string | undefined) ?? null,
                    salonId: (args.salonId as string | undefined) || salonId,
                  },
                })
              } else {
                toolResults.push({ name, result: toolResult })
              }
            }
          } catch (e) {
            const rawMessage = (e as Error).message
            const isDateError =
              rawMessage.includes('Invalid time value') ||
              rawMessage.includes('Invalid Date') ||
              e instanceof RangeError
            if (isDateError) {
              result = JSON.stringify({
                error:
                  'Nieprawidłowy format daty. Podaj datę i godzinę w formacie ISO 8601, np. 2026-08-10T10:00:00.',
              })
            } else {
              console.error('Tool execution error:', rawMessage)
              result = JSON.stringify({
                error: 'Wystąpił błąd podczas przetwarzania narzędzia. Spróbuj ponownie.',
              })
            }
          }

        // Add assistant message with tool call
        messages.push({
          role: 'assistant',
          content: response.content || '',
          tool_calls: [
            {
              id: tc.id,
              type: 'function',
              function: { name, arguments: argsStr },
            },
          ],
        })

        // Add tool response
        messages.push({
          role: 'tool',
          content: result,
          tool_call_id: tc.id,
        })
      }
    }

    return { message: 'Przepraszam, wystąpił błąd. Spróbuj ponownie.' }
  } catch (e) {
    const errorMessage = (e as Error).message
    console.error('Chat LLM error:', errorMessage)
    if (errorMessage.includes('Brak skonfigurowanego AI')) {
      return { error: 'Asystent AI nie jest skonfigurowany. Dodaj DEEPSEEK_API_KEY, GEMINI_API_KEY lub GROQ_API_KEY do .env.' }
    }
    if (errorMessage.includes('rate_limit') || errorMessage.includes('429')) {
      return { error: 'Zbyt wiele zapytań. Odczekaj chwilę i spróbuj ponownie.' }
    }
    if (errorMessage.includes('tool_use_failed')) {
      return { error: 'Model AI ma problem z przetworzeniem żądania. Spróbuj sformułować inaczej.' }
    }
    return { error: 'Przepraszam, wystąpił błąd. Spróbuj ponownie za chwilę.' }
  }
})

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  context: {
    supabase: ReturnType<typeof getSupabaseServerClient>
    admin: Awaited<ReturnType<typeof createAdminClient>>
    clientId: string
    salonId: string | null
  },
): Promise<unknown> {
  const { supabase, admin, clientId, salonId } = context

  // Salon z sesji klienta ma pierwszeństwo — argumenty narzędzi LLM nie mogą
  // przekierować rozmowy do innego gabinetu (ochrona przed prompt injection).
  const targetSalonId = salonId ?? (args.salonId as string | undefined) ?? null

  switch (name) {
    case 'searchTreatments': {
      const query = (args.query as string) || ''
      let dbQuery = admin
        .from('treatments')
        .select(`
          id, name, description, duration_minutes, price, salon_id, indications,
          salons!inner(id, name, phone, address)
        `)
        .order('name')

      if (targetSalonId) {
        dbQuery = dbQuery.eq('salon_id', targetSalonId)
      }

      const { data } = await dbQuery.limit(50)

      // Smart search: match name, description, AND indications array
      let treatments = (data || [])
      if (query) {
        const q = query.toLowerCase()
        treatments = treatments.filter((t: Record<string, unknown>) => {
          const name = (t.name as string || '').toLowerCase()
          const desc = (t.description as string || '').toLowerCase()
          const inds = (t.indications as string[] || [])
          return inds.some((i) => i.toLowerCase().includes(q)) || name.includes(q) || desc.includes(q)
        })
      }

      const result = treatments.map((t: Record<string, unknown>) => {
        const salon = t.salons as { name: string; phone: string | null; address: string | null } | null
        return {
          id: t.id as string,
          name: t.name as string,
          description: t.description as string | null,
          duration_minutes: t.duration_minutes as number,
          price: t.price as number | null,
          salon_id: t.salon_id as string,
          indications: t.indications as string[] | null,
          salon_name: salon?.name || '',
          salon_address: salon?.address || '',
          salon_phone: salon?.phone || '',
        }
      })

      return { treatments: result }
    }

    case 'findAvailableSlots': {
      const date = (args.date as string) || new Date().toISOString().split('T')[0]
      const treatmentId = args.treatmentId as string | undefined
      if (!targetSalonId) return { error: 'Nie określono gabinetu.' }

      let durationMinutes = 60
      if (treatmentId) {
        let treatmentQuery = supabase
          .from('treatments')
          .select('duration_minutes')
          .eq('id', treatmentId)
        if (targetSalonId) treatmentQuery = treatmentQuery.eq('salon_id', targetSalonId)
        const { data: treatment } = await treatmentQuery.maybeSingle()
        if (treatment) durationMinutes = treatment.duration_minutes
      }

      const dayStart = `${date}T00:00:00`
      const dayEnd = `${date}T23:59:59`

      const [aptResult, blockResult] = await Promise.all([
        admin
          .from('appointments')
          .select('start_time, duration_minutes')
          .eq('salon_id', targetSalonId)
          .gte('start_time', dayStart)
          .lt('start_time', dayEnd)
          .neq('status', 'cancelled'),
        admin
          .from('time_blocks')
          .select('start_time, end_time')
          .eq('salon_id', targetSalonId)
          .lt('start_time', dayEnd)
          .gt('end_time', dayStart),
      ])

      const slots = findAvailableSlots({
        appointments: (aptResult.data || []) as Array<{
          start_time: string
          duration_minutes: number
        }>,
        timeBlocks: (blockResult.data || []) as Array<{
          start_time: string
          end_time: string
        }>,
        date,
        durationMinutes,
      })

      return { slots }
    }

    case 'getRequiredForms': {
      const treatmentId = args.treatmentId as string
      const { data: treatmentForms } = await admin
        .from('treatment_forms')
        .select('form_id, forms (id, title, description)')
        .eq('treatment_id', treatmentId)

      const formIds = treatmentForms?.map((tf) => tf.form_id) || []
      let submittedFormIds: string[] = []

      if (formIds.length > 0) {
        const { data: submissions } = await admin
          .from('submissions')
          .select('form_id')
          .eq('client_id', clientId)
          .in('form_id', formIds)
        submittedFormIds = submissions?.map((s) => s.form_id) || []
      }

      let pendingClientForms: Array<{ form_id: string; token: string }> = []
      if (formIds.length > 0) {
        const { data } = await admin
          .from('client_forms')
          .select('form_id, token')
          .eq('client_id', clientId)
          .in('form_id', formIds)
          .eq('status', 'pending')
        pendingClientForms = (data || []) as Array<{ form_id: string; token: string }>
      }
      const tokenMap = new Map(pendingClientForms.map((cf) => [cf.form_id, cf.token]))

      const forms = (treatmentForms || []).map((tf) => {
        const filled = submittedFormIds.includes(tf.form_id)
        const token = tokenMap.get(tf.form_id)
        return {
          id: tf.form_id,
          title: (tf.forms as { title?: string } | null)?.title || '',
          description: (tf.forms as { description?: string | null } | null)?.description || null,
          filled,
          ...(token ? { token, fillUrl: `/f/${token}` } : {}),
        }
      })

      const unfilledForms = forms.filter((f) => !f.filled)

      return { forms: unfilledForms }
    }

    case 'bookAppointment': {
      const treatmentId = args.treatmentId as string
      const startTime = args.startTime as string
      if (!targetSalonId) return { error: 'Nie określono gabinetu.' }

      let treatmentQuery = admin
        .from('treatments')
        .select(`
          id, name, duration_minutes, price, salon_id,
          salons!inner(id, name, address)
        `)
        .eq('id', treatmentId)
      if (targetSalonId) {
        treatmentQuery = treatmentQuery.eq('salon_id', targetSalonId)
      }

      const { data: treatment } = await treatmentQuery.single()
      if (!treatment) {
        return { error: 'Nie znaleziono zabiegu. Użyj narzędzia searchTreatments, aby znaleźć dostępne zabiegi.' }
      }

      const durationMinutes = treatment.duration_minutes as number
      const start = new Date(startTime)
      const end = new Date(start.getTime() + durationMinutes * 60000)

      const dayStart = new Date(start)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(start)
      dayEnd.setHours(23, 59, 59, 999)

      const parsedStart = new Date(startTime)
      if (Number.isNaN(parsedStart.getTime())) {
        return {
          error:
            'Nieprawidłowy format daty. Podaj datę i godzinę w formacie ISO 8601, np. 2026-08-10T10:00:00.',
        }
      }

      if (parsedStart.getTime() <= Date.now()) {
        return { error: 'Nie można umówić wizyty w przeszłości. Sprawdź dostępne terminy narzędziem findAvailableSlots.' }
      }

      const { data: blocks } = await admin
        .from('time_blocks')
        .select('start_time, end_time')
        .eq('salon_id', treatment.salon_id)
        .lt('start_time', dayEnd.toISOString())
        .gt('end_time', dayStart.toISOString())

      const hasBlockOverlap = (blocks || []).some((block) => {
        const blockStart = new Date(block.start_time)
        const blockEnd = new Date(block.end_time)
        return start < blockEnd && end > blockStart
      })

      if (hasBlockOverlap) {
        return { error: 'Ten termin jest niedostępny. Sprawdź dostępne terminy narzędziem findAvailableSlots.' }
      }

      const { data: existing } = await admin
        .from('appointments')
        .select('start_time, duration_minutes')
        .eq('salon_id', treatment.salon_id)
        .gte('start_time', dayStart.toISOString())
        .lt('start_time', dayEnd.toISOString())
        .neq('status', 'cancelled')

      const hasOverlap = (existing || []).some((apt) => {
        const aptStart = new Date(apt.start_time)
        const aptEnd = new Date(aptStart.getTime() + apt.duration_minutes * 60000)
        return start < aptEnd && end > aptStart
      })

      if (hasOverlap) return { error: 'Termin jest już zajęty.' }

      const salon = treatment.salons as unknown as {
        name: string
        address: string | null
      } | null

      return {
        needsConfirmation: true,
        offer: {
          treatmentId: treatment.id,
          treatmentName: treatment.name,
          price: treatment.price as number | null,
          durationMinutes,
          salonId: treatment.salon_id,
          salonName: salon?.name || '',
          salonAddress: salon?.address ?? null,
          startTime,
        },
      }
    }

    case 'getClientInfo': {
      const { data: client } = await supabase
        .from('clients')
        .select('id, name, email, phone, salon_id')
        .eq('id', clientId)
        .single()

      const { data: history } = await supabase
        .from('appointments')
        .select('*, treatments (id, name)')
        .eq('client_id', clientId)
        .order('start_time', { ascending: false })
        .limit(10)

      return { client, history: history || [] }
    }

    default:
      return { error: `Nieznane narzędzie: ${name}` }
  }
}

export const getChatHistoryFn = createServerFn({ method: 'GET' }).handler(async () => {
  const supabase = getSupabaseServerClient()
  const clientInfo = await getClientId(supabase)
  if (!clientInfo) return { history: [] }

  const { data } = await supabase
    .from('chat_messages')
    .select('id, salon_id, client_id, role, content, tool_calls, created_at')
    .eq('client_id', clientInfo.clientId)
    .order('created_at', { ascending: false })
    .limit(20)

  const history =
    data?.map((m) => {
      const tc = m.tool_calls
      let toolCalls: any[] = []
      if (typeof tc === 'string') {
        try {
          toolCalls = JSON.parse(tc)
        } catch {
          toolCalls = []
        }
      } else if (Array.isArray(tc)) {
        toolCalls = tc
      }
      return {
        id: m.id,
        salon_id: m.salon_id,
        client_id: m.client_id,
        role: m.role,
        content: m.content,
        tool_calls: toolCalls,
        created_at: m.created_at,
      }
    }) || []

  const formToolIds = new Set<string>()
  for (const msg of history) {
    for (const tool of msg.tool_calls) {
      if (
        (tool?.name === 'bookingResult' || tool?.name === 'getRequiredForms') &&
        Array.isArray(tool.result?.forms)
      ) {
        for (const form of tool.result.forms) {
          if (form?.id) formToolIds.add(form.id)
        }
      }
    }
  }

  let filledFormIds = new Set<string>()
  if (formToolIds.size > 0) {
    const admin = await createAdminClient()
    const { data: submissions } = await admin
      .from('submissions')
      .select('form_id')
      .eq('client_id', clientInfo.clientId)
      .in('form_id', [...formToolIds])
    filledFormIds = new Set((submissions ?? []).map((s) => s.form_id))
  }

  const historyWithFreshFillStatus = history.map((msg) => {
    const toolCalls = msg.tool_calls.map((tool) => {
      if (tool?.name === 'getRequiredForms' && Array.isArray(tool.result?.forms)) {
        return {
          ...tool,
          result: {
            ...tool.result,
            forms: tool.result.forms.filter(
              (form: { id: string }) => !filledFormIds.has(form.id),
            ),
          },
        }
      }
      if (tool?.name !== 'bookingResult' || !Array.isArray(tool.result?.forms)) return tool
      return {
        ...tool,
        result: {
          ...tool.result,
          forms: tool.result.forms.map(
            (form: { id: string; title: string; token: string; fillUrl: string }) => ({
              id: form.id,
              title: form.title,
              token: form.token,
              fillUrl: form.fillUrl,
              filled: filledFormIds.has(form.id),
            }),
          ),
        },
      }
    })
    return { ...msg, tool_calls: toolCalls }
  })

  return { history: historyWithFreshFillStatus }
})
