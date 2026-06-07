import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '../utils/supabase'
import { callLLM, type LLMMessage } from './llm'
import { findAvailableSlots } from './availability'

export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

interface ChatMessage {
  id: string
  salon_id: string
  client_id: string
  role: string
  content: string
  created_at: string
}

async function getClientId(supabase: ReturnType<typeof getSupabaseServerClient>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: client } = await supabase
    .from('clients')
    .select('id, salon_id')
    .eq('user_id', user.id)
    .single()
  return client ? { clientId: client.id, salonId: client.salon_id } : null
}

export const sendChatMessageFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { message: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const clientInfo = await getClientId(supabase)
    if (!clientInfo) return { error: 'Nie znaleziono profilu klienta' }

    const { clientId, salonId } = clientInfo

    // Save user message
    await supabase.from('chat_messages').insert({
      salon_id: salonId,
      client_id: clientId,
      role: 'user',
      content: data.message,
    })

    // Get conversation history
    const { data: history } = await supabase
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

    // Main LLM loop
    const MAX_ITERATIONS = 5
    let iterations = 0

    while (iterations < MAX_ITERATIONS) {
      iterations++

      const response = await callLLM(messages)

      if (!response.toolCalls || response.toolCalls.length === 0) {
        // LLM finished - return final response
        await supabase.from('chat_messages').insert({
          salon_id: salonId,
          client_id: clientId,
          role: 'assistant',
          content: response.content,
        })

        return {
          message: response.content,
          history: [],
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
          const toolResult = await executeTool(name, args, { supabase, clientId, salonId })
          result = JSON.stringify(toolResult)
        } catch (e) {
          result = JSON.stringify({ error: (e as Error).message })
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
  })

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  context: {
    supabase: ReturnType<typeof getSupabaseServerClient>
    clientId: string
    salonId: string
  },
): Promise<unknown> {
  const { supabase, clientId, salonId } = context

  switch (name) {
    case 'searchTreatments': {
      const query = (args.query as string) || ''
      const { data } = await supabase
        .from('treatments')
        .select('id, name, description, duration_minutes, price')
        .eq('salon_id', salonId)
        .ilike('name', `%${query}%`)
        .order('name')
        .limit(10)
      return { treatments: data || [] }
    }

    case 'findAvailableSlots': {
      const date = (args.date as string) || new Date().toISOString().split('T')[0]
      const treatmentId = args.treatmentId as string | undefined

      let durationMinutes = 60
      if (treatmentId) {
        const { data: treatment } = await supabase
          .from('treatments')
          .select('duration_minutes')
          .eq('id', treatmentId)
          .single()
        if (treatment) durationMinutes = treatment.duration_minutes
      }

      const dayStart = `${date}T00:00:00`
      const dayEnd = `${date}T23:59:59`

      const [aptResult, blockResult] = await Promise.all([
        supabase
          .from('appointments')
          .select('start_time, duration_minutes')
          .eq('salon_id', salonId)
          .gte('start_time', dayStart)
          .lt('start_time', dayEnd)
          .neq('status', 'cancelled'),
        supabase
          .from('time_blocks')
          .select('start_time, end_time')
          .eq('salon_id', salonId)
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
      const { data: treatmentForms } = await supabase
        .from('treatment_forms')
        .select('form_id, forms (id, title, description)')
        .eq('treatment_id', treatmentId)

      // Check which forms are already filled
      const formIds = treatmentForms?.map((tf) => tf.form_id) || []
      let submittedFormIds: string[] = []

      if (formIds.length > 0) {
        const { data: submissions } = await supabase
          .from('submissions')
          .select('form_id')
          .eq('client_id', clientId)
          .in('form_id', formIds)
        submittedFormIds = submissions?.map((s) => s.form_id) || []
      }

      const forms = (treatmentForms || []).map((tf) => ({
        id: tf.form_id,
        title: (tf.forms as { title?: string } | null)?.title || '',
        description: (tf.forms as { description?: string | null } | null)?.description || null,
        filled: submittedFormIds.includes(tf.form_id),
      }))

      return { forms }
    }

    case 'bookAppointment': {
      const treatmentId = args.treatmentId as string
      const startTime = args.startTime as string

      // Check for required forms
      const { data: requiredForms } = await supabase
        .from('treatment_forms')
        .select('form_id')
        .eq('treatment_id', treatmentId)

      const requiredFormIds = requiredForms?.map((r) => r.form_id) || []
      let status: 'scheduled' | 'pending_forms' = 'scheduled'

      if (requiredFormIds.length > 0) {
        const { data: clientSubmissions } = await supabase
          .from('submissions')
          .select('form_id')
          .eq('client_id', clientId)
          .in('form_id', requiredFormIds)
        const submittedSet = new Set(clientSubmissions?.map((s) => s.form_id) || [])
        if (!requiredFormIds.every((id) => submittedSet.has(id))) {
          status = 'pending_forms'
        }
      }

      const { data: appointment, error } = await supabase
        .from('appointments')
        .insert({
          salon_id: salonId,
          client_id: clientId,
          treatment_id: treatmentId,
          start_time: startTime,
          status,
        })
        .select('*, treatments (name, duration_minutes, price)')
        .single()

      if (error) return { error: error.message }

      return { appointment, status }
    }

    case 'getClientInfo': {
      const { data: client } = await supabase
        .from('clients')
        .select('id, name, email, phone')
        .eq('id', clientId)
        .single()

      const { data: history } = await supabase
        .from('appointments')
        .select('*, treatments (name)')
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
    .select('id, salon_id, client_id, role, content, created_at')
    .eq('client_id', clientInfo.clientId)
    .order('created_at', { ascending: false })
    .limit(20)

  return { history: data || [] }
})
