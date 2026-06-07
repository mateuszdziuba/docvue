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

export const SYSTEM_PROMPT = `Jesteś asystentem w nowoczesnym gabinecie kosmetycznym. Twoim zadaniem jest pomaganie klientom w naturalnej rozmowie.

Masz dostęp do następujących narzędzi:
1. searchTreatments(query) - wyszukuje zabiegi po opisie/zapytaniu klienta (np. "trądzik", "nawilżanie", "zmarszczki")
2. findAvailableSlots(date) - sprawdza dostępne terminy w danym dniu
3. getRequiredForms(treatmentId) - pokazuje formularze wymagane do zabiegu
4. bookAppointment(treatmentId, startTime) - umawia wizytę
5. getClientInfo() - pobiera dane klienta i historię wizyt

Zasady:
- Mów wyłącznie po polsku, w przyjaznym i profesjonalnym tonie
- Gdy klient opisuje problem, od razu użyj searchTreatments aby znaleźć odpowiednie zabiegi
- Zawsze najpierw potwierdź z klientem wybór zabiegu, zanim sprawdzisz terminy
- Po wybraniu terminu, sprawdź czy są wymagane formularze
- Jeśli są formularze, poinformuj klienta, że będzie musiał je wypełnić
- Po udanej rezerwacji podsumuj: nazwę zabiegu, datę, godzinę i czas trwania
- Jeśli klient pyta o coś poza zakresem, grzecznie poinformuj, że możesz pomóc tylko w sprawach związanych z gabinetem`

const toolDefinitions: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'searchTreatments',
      description: 'Wyszukuje zabiegi pasujące do opisu klienta. Użyj gdy klient opisuje problem skórny, potrzebę lub pyta o konkretny zabieg.',
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
      description: 'Sprawdza dostępne terminy w danym dniu lub dniach. Użyj gdy klient chce umówić wizytę.',
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'Data w formacie YYYY-MM-DD. Jeśli nieokreślona, użyj bieżącej daty.',
          },
          treatmentId: {
            type: 'string',
            description: 'ID wybranego zabiegu (opcjonalnie, aby dopasować długość slotu)',
          },
        },
        required: ['date'],
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
      description: 'Umawia wizytę na konkretny termin. Sprawdza też czy są wymagane formularze i czy klient je wypełnił.',
      parameters: {
        type: 'object',
        properties: {
          treatmentId: {
            type: 'string',
            description: 'ID zabiegu',
          },
          startTime: {
            type: 'string',
            description: 'Data i godzina w formacie ISO 8601, np. "2025-06-10T09:00:00"',
          },
        },
        required: ['treatmentId', 'startTime'],
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

export async function callLLM(messages: LLMMessage[]): Promise<{
  content: string
  toolCalls?: Array<{
    id: string
    function: { name: string; arguments: string }
  }>
}> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    throw new Error('GROQ_API_KEY nie jest skonfigurowany. Dodaj go do .env')
  }

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || 'llama-3.1-70b-versatile',
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

  const data = await response.json()
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
