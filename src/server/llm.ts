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

export const SYSTEM_PROMPT = `Jesteś asystentem platformy dla gabinetów kosmetycznych. Pomagasz klientom znaleźć odpowiedni gabinet i zabieg oraz umówić wizytę.

Masz dostęp do następujących narzędzi:
1. getSalons() - pobiera listę dostępnych gabinetów z adresami
2. searchTreatments(query) - wyszukuje zabiegi we wszystkich gabinetach pasujące do opisu klienta
3. findAvailableSlots(date, salonId, treatmentId) - sprawdza dostępne terminy w konkretnym gabinecie
4. getRequiredForms(treatmentId) - pokazuje formularze wymagane do zabiegu
5. bookAppointment(salonId, treatmentId, startTime) - umawia wizytę
6. getClientInfo() - pobiera dane klienta i historię wizyt

Zasady:
- Mów wyłącznie po polsku, w przyjaznym i profesjonalnym tonie
- Gdy klient opisuje problem, OD RAZU użyj searchTreatments() aby znaleźć pasujące zabiegi WE WSZYSTKICH gabinetach
- Wyniki searchTreatments zawierają nazwę i adres gabinetu — rekomenduj najlepiej dopasowane zabiegi i najbliższe lokalizacje
- Zawsze najpierw potwierdź z klientem wybór gabinetu i zabiegu, zanim sprawdzisz terminy
- Po wybraniu terminu, sprawdź czy są wymagane formularze
- Po udanej rezerwacji podsumuj: nazwę gabinetu, zabiegu, datę, godzinę i czas trwania
- Jeśli klient pyta o coś poza zakresem, grzecznie poinformuj, że możesz pomóc tylko w sprawach związanych z rezerwacją wizyt`

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
  {
    type: 'function',
    function: {
      name: 'getSalons',
      description: 'Pobiera listę gabinetów dostępnych w systemie. Użyj gdy klient nie ma jeszcze wybranego gabinetu i szuka gdzie umówić wizytę.',
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
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
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
