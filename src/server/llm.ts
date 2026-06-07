import type { ToolCall } from './chat'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

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

export const SYSTEM_PROMPT = `Jesteś asystentem rezerwacji wizyt w gabinetach kosmetycznych. Mów wyłącznie po polsku, krótko i rzeczowo.

WAŻNE:
- Klient opisuje problem (np. sucha skóra, trądzik, zmarszczki) → NATYCHMIAST wołaj searchTreatments() z opisem problemu
- searchTreatments zwróci zabiegi dopasowane do problemu (szuka w nazwie, opisie i wskazaniach)
- Klient mówi "pokaż", "co macie" → wołaj searchTreatments("")
- Po wybraniu zabiegu wołaj findAvailableSlots()
- Po wybraniu terminu wołaj bookAppointment()
- NIE zadawaj pytań "jak mogę pomóc" — od razu używaj narzędzi`

const toolDefinitions: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'searchTreatments',
      description: 'Wyszukuje zabiegi we wszystkich gabinetach pasujące do opisu klienta. Zwraca też nazwę i adres gabinetu.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Opis problemu lub nazwa zabiegu, np. "trądzik", "nawilżanie cery suchej", "lifting twarzy"',
          },
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
          date: {
            type: 'string',
            description: 'Data w formacie YYYY-MM-DD',
          },
          salonId: {
            type: 'string',
            description: 'ID gabinetu',
          },
          treatmentId: {
            type: 'string',
            description: 'ID wybranego zabiegu',
          },
        },
        required: ['date', 'salonId', 'treatmentId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getRequiredForms',
      description: 'Sprawdza jakie formularze są wymagane do wybranego zabiegu.',
      parameters: {
        type: 'object',
        properties: {
          treatmentId: {
            type: 'string',
            description: 'ID zabiegu',
          },
        },
        required: ['treatmentId'],
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
          salonId: {
            type: 'string',
            description: 'ID gabinetu',
          },
          treatmentId: {
            type: 'string',
            description: 'ID zabiegu',
          },
          startTime: {
            type: 'string',
            description: 'Data i godzina w formacie ISO 8601, np. "2025-06-10T09:00:00"',
          },
        },
        required: ['salonId', 'treatmentId', 'startTime'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getClientInfo',
      description: 'Pobiera dane zalogowanego klienta oraz historię jego wizyt.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
]

async function callOllama(messages: LLMMessage[]) {
  const endpoint = (process.env.OLLAMA_ENDPOINT || 'http://localhost:11434').replace(/\/$/, '')
  const model = process.env.OLLAMA_MODEL || 'llama3.1:8b'

  const response = await fetch(`${endpoint}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      tools: toolDefinitions,
      stream: false,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Błąd Ollama (${response.status}): ${text}`)
  }

  const data = await response.json()
  // Transform Ollama native format to OpenAI-compatible shape
  return {
    choices: [{
      message: {
        content: data.message?.content || '',
        tool_calls: data.message?.tool_calls?.map((tc: { function: { name: string; arguments: string } }, i: number) => ({
          id: `call_${i}`,
          type: 'function' as const,
          function: {
            name: tc.function.name,
            arguments: typeof tc.function.arguments === 'string' ? tc.function.arguments : JSON.stringify(tc.function.arguments),
          },
        })),
      },
    }],
  }
}

async function callGroq(messages: LLMMessage[]) {
  const apiKey = process.env.GROQ_API_KEY
  const model = process.env.GROQ_MODEL || 'llama-3.1-8b-instant'

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
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
    throw new Error(`Błąd API Groq (${response.status}): ${text}`)
  }

  return response.json()
}

export async function callLLM(messages: LLMMessage[]): Promise<{
  content: string
  toolCalls?: Array<{
    id: string
    function: { name: string; arguments: string }
  }>
}> {
  const ollamaEndpoint = (process.env.OLLAMA_ENDPOINT || 'http://localhost:11434').replace(/\/$/, '')

  // Prefer Ollama (lokalny, bez limitów)
  try {
    const health = await fetch(`${ollamaEndpoint}/api/tags`, { signal: AbortSignal.timeout(2000) })
    if (health.ok) {
      const data = await callOllama(messages)
      const choice = data.choices?.[0]?.message
      if (!choice) {
        return { content: 'Przepraszam, wystąpił błąd. Spróbuj ponownie za chwilę.' }
      }
      return {
        content: choice.content || '',
        toolCalls: choice.tool_calls?.map((tc: ToolCall) => ({
          id: tc.id,
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments,
          },
        })),
      }
    }
  } catch {
    // Ollama unavailable — fall through to Groq
  }

  // Fallback: Groq (jeśli skonfigurowany)
  if (process.env.GROQ_API_KEY) {
    try {
      const data = await callGroq(messages)
      const choice = data.choices?.[0]?.message
      if (!choice) {
        return { content: 'Przepraszam, wystąpił błąd. Spróbuj ponownie za chwilę.' }
      }
      return {
        content: choice.content || '',
        toolCalls: choice.tool_calls?.map((tc: ToolCall) => ({
          id: tc.id,
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments,
          },
        })),
      }
    } catch (e) {
      throw new Error(`Błąd API Groq: ${(e as Error).message}`)
    }
  }

  throw new Error('Brak skonfigurowanego AI. Uruchom Ollama (lokalnie) lub dodaj GROQ_API_KEY do .env')
}
