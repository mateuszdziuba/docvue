import type { ToolCall } from './chat'

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

const GEMINI_API = 'https://generativelanguage.googleapis.com/v1beta/models'
const GEMINI_MODEL = 'gemini-2.0-flash'

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: {
      name: string
      arguments: string
    }
  }>
  tool_call_id?: string
}

interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

export const SYSTEM_PROMPT = `Jesteś asystentem rezerwacji wizyt w gabinetach kosmetycznych w Polsce. Mów wyłącznie po polsku.

Jeśli w kontekście są dostępne zabiegi — poleć je klientowi.
Jeśli klient prosi o polecenie zabiegu lub chce się umówić na konkretny zabieg — najpierw użyj narzędzia searchTreatments.
Jeśli klient pyta o termin lub chce umówić — użyj narzędzi.
Bądź naturalny i krótki. Nie wymyślaj zabiegów — korzystaj tylko z podanych.
Zawsze najpierw sprawdź dostępność narzędziem findAvailableSlots, zanim zaproponujesz lub umówisz termin. Nigdy nie zgaduj dat, godzin ani identyfikatorów — jeśli klient nie podał dnia, zapytaj go, na który dzień szuka terminu. Formularze już wypełnione przez klienta nie są wymagane — nie proponuj ich ponownie.`

const toolDefinitions: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'searchTreatments',
      description: 'Wyszukuje zabiegi w bazie gabinetu po nazwie, opisie lub wskazaniach.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Fraza do wyszukania' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'findAvailableSlots',
      description: 'Sprawdza dostępne terminy w danym dniu w wybranym gabinecie dla konkretnego zabiegu.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Data w formacie YYYY-MM-DD' },
          salonId: { type: 'string', description: 'ID gabinetu' },
          treatmentId: { type: 'string', description: 'ID zabiegu' },
        },
        required: ['date', 'salonId', 'treatmentId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'bookAppointment',
      description: 'Umawia wizytę w wybranym gabinecie na konkretny termin.',
      parameters: {
        type: 'object',
        properties: {
          salonId: { type: 'string', description: 'ID gabinetu' },
          treatmentId: { type: 'string', description: 'ID zabiegu' },
          startTime: { type: 'string', description: 'Data i godzina ISO 8601' },
        },
        required: ['salonId', 'treatmentId', 'startTime'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getRequiredForms',
      description: 'Sprawdza, które formularze są wymagane do wybranego zabiegu (tylko jeszcze niewypełnione).',
      parameters: {
        type: 'object',
        properties: {
          treatmentId: { type: 'string', description: 'ID zabiegu' },
        },
        required: ['treatmentId'],
      },
    },
  },
]

// ─── DeepSeek ───────────────────────────────────────────────────────────────

async function callDeepSeek(messages: LLMMessage[]) {
  const apiKey = process.env.DEEPSEEK_API_KEY
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat'

  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      tools: toolDefinitions,
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 2048,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Błąd DeepSeek (${response.status}): ${text}`)
  }

  const data = await response.json()
  const choice = data.choices?.[0]?.message
  return {
    content: choice?.content || '',
    toolCalls: choice?.tool_calls?.map((tc: ToolCall) => ({
      id: tc.id,
      type: 'function' as const,
      function: { name: tc.function.name, arguments: tc.function.arguments },
    })),
  }
}

// ─── Gemini ─────────────────────────────────────────────────────────────────

async function callGemini(messages: LLMMessage[]): Promise<{
  content: string
  toolCalls?: ToolCall[]
}> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('Brak GEMINI_API_KEY')

  const body: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
  }

  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m, idx, arr) => {
      if (m.role === 'tool') {
        // Find matching function name from previous assistant message
        let fnName = m.tool_call_id || 'unknown'
        for (let i = idx - 1; i >= 0; i--) {
          const call = arr[i].tool_calls?.[0]
          if (call && (call.function.name === fnName || call.id === fnName)) {
            fnName = call.function.name
            break
          }
        }
        let responseData: Record<string, unknown> = {}
        try { responseData = JSON.parse(m.content || '{}') } catch { responseData = { error: m.content } }
        return {
          role: 'function',
          parts: [{
            functionResponse: {
              name: fnName,
              response: responseData,
            },
          }],
        }
      }
      const role = m.role === 'assistant' ? 'model' : 'user'
      const parts: Record<string, unknown>[] = [{ text: m.content || '' }]
        if (m.tool_calls) {
          parts.push({
            functionCall: {
              name: m.tool_calls[0].function.name,
              args: JSON.parse(m.tool_calls[0].function.arguments),
            },
          })
        }
        return { role, parts }
      })

  // Gemini wymaga co najmniej jednego wpisu w contents
  if (contents.length === 0) {
    contents.push({ role: 'user', parts: [{ text: 'Witaj' }] })
  }
  body.contents = contents

  body.tools = [{
    functionDeclarations: toolDefinitions.map((t) => ({
      name: t.function.name,
      description: t.function.description,
      parameters: t.function.parameters,
    })),
  }]

  const response = await fetch(
    `${GEMINI_API}/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
  )

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Błąd Gemini (${response.status}): ${text}`)
  }

  const data = await response.json()
  const candidate = data.candidates?.[0]
  if (!candidate) return { content: 'Brak odpowiedzi.' }

  const fc = candidate.content?.parts?.find((p: Record<string, unknown>) => p.functionCall)

  if (fc?.functionCall) {
    const call = fc.functionCall as { name: string; args: string }
    return {
      content: '',
      toolCalls: [{
        id: `fc_${Date.now()}`,
        type: 'function' as const,
        function: {
          name: call.name,
          arguments: typeof call.args === 'string' ? call.args : JSON.stringify(call.args),
        },
      }],
    }
  }

  const text = candidate.content?.parts?.map((p: Record<string, unknown>) => p.text).filter(Boolean).join('') || ''
  return { content: text }
}

// ─── Ollama ──────────────────────────────────────────────────────────────────

async function callOllama(messages: LLMMessage[]) {
  const endpoint = (process.env.OLLAMA_ENDPOINT || 'http://localhost:11434').replace(/\/$/, '')
  const model = process.env.OLLAMA_MODEL || 'llama3.1:8b'

  const response = await fetch(`${endpoint}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      stream: false,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Błąd Ollama (${response.status}): ${text}`)
  }

  const data = await response.json()
  const msg = data.message || {}

  return {
    content: msg.content || '',
    toolCalls: msg.tool_calls?.map((tc: { function: { name: string; arguments: string } }, i: number) => ({
      id: `call_${i}`,
      type: 'function' as const,
      function: {
        name: tc.function.name,
        arguments: typeof tc.function.arguments === 'string' ? tc.function.arguments : JSON.stringify(tc.function.arguments),
      },
    })),
  }
}

// ─── Groq (fallback) ────────────────────────────────────────────────────────

async function callGroq(messages: LLMMessage[]) {
  const apiKey = process.env.GROQ_API_KEY
  const model = process.env.GROQ_MODEL || 'llama-3.1-8b-instant'

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      tools: toolDefinitions,
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 2048,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Błąd Groq (${response.status}): ${text}`)
  }

  const data = await response.json()
  const choice = data.choices?.[0]?.message
  return {
    content: choice?.content || '',
    toolCalls: choice?.tool_calls?.map((tc: ToolCall) => ({
      id: tc.id,
      type: 'function' as const,
      function: { name: tc.function.name, arguments: tc.function.arguments },
    })),
  }
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────

export async function callLLM(messages: LLMMessage[]) {
  // 1. DeepSeek (podstawowa opcja)
  if (process.env.DEEPSEEK_API_KEY) {
    try {
      return await callDeepSeek(messages)
    } catch (e) {
      console.error('DeepSeek error:', (e as Error).message)
    }
  }

  // 2. Gemini
  if (process.env.GEMINI_API_KEY) {
    try {
      return await callGemini(messages)
    } catch (e) {
      console.error('Gemini error:', (e as Error).message)
    }
  }

  // 3. Ollama (lokalny)
  const ollamaEndpoint = (process.env.OLLAMA_ENDPOINT || 'http://localhost:11434').replace(/\/$/, '')
  try {
    const health = await fetch(`${ollamaEndpoint}/api/tags`, { signal: AbortSignal.timeout(2000) })
    if (health.ok) return await callOllama(messages)
  } catch { /* ollama unavailable */ }

  // 4. Groq (ostatnia deska)
  if (process.env.GROQ_API_KEY) {
    try {
      return await callGroq(messages)
    } catch (e) {
      throw new Error(`Błąd Groq: ${(e as Error).message}`)
    }
  }

  throw new Error(
    'Brak skonfigurowanego AI. Dodaj DEEPSEEK_API_KEY do .env (https://platform.deepseek.com) ' +
    'lub GEMINI_API_KEY (https://aistudio.google.com/apikey) albo GROQ_API_KEY (https://console.groq.com/keys), ' +
    'ewentualnie uruchom lokalnie Ollama.',
  )
}
