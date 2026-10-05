import { getSupabaseServerClient } from '../utils/supabase'
import { callLLM } from './llm'

const WHATSAPP_API = 'https://graph.facebook.com/v21.0'

async function getPhoneNumberId() {
  return process.env.WHATSAPP_PHONE_NUMBER_ID || ''
}

async function getAccessToken() {
  return process.env.WHATSAPP_ACCESS_TOKEN || ''
}

export async function sendWhatsAppMessage(to: string, text: string) {
  const phoneNumberId = await getPhoneNumberId()
  const token = await getAccessToken()

  if (!phoneNumberId || !token) {
    console.warn('WhatsApp not configured')
    return { error: 'WhatsApp not configured' }
  }

  const response = await fetch(
    `${WHATSAPP_API}/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
      }),
    },
  )

  if (!response.ok) {
    const text = await response.text()
    console.error('WhatsApp API error:', text)
    return { error: text }
  }

  return await response.json()
}

export async function handleWhatsAppIncoming(from: string, messageText: string) {
  const supabase = getSupabaseServerClient()

  // Find client by phone number
  const { data: client } = await supabase
    .from('clients')
    .select('id, salon_id, name')
    .eq('phone', from)
    .maybeSingle()

  if (!client) {
    await sendWhatsAppMessage(
      from,
      'Przepraszam, nie znaleziono Twojego profilu w systemie. Skontaktuj się z gabinetem, aby dodać Twój numer telefonu.',
    )
    return
  }

  const { clientId, salonId } = { clientId: client.id, salonId: client.salon_id }

  // Save user message
  await supabase.from('chat_messages').insert({
    salon_id: salonId,
    client_id: clientId,
    role: 'user',
    content: messageText,
  })

  // Get conversation history
  const { data: history } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('client_id', clientId)
    .order('created_at', { ascending: true })
    .limit(50)

  const messages = (history || []).map((m) => ({
    role: m.role as 'user' | 'assistant' | 'system' | 'tool',
    content: m.content || '',
  }))

  // Call LLM
  try {
    const response = await callLLM(messages)

    if (response.toolCalls && response.toolCalls.length > 0) {
      // Simple: just return info about tools used
      // In production, you'd implement the full loop
      const toolNames = response.toolCalls.map((tc: { function: { name: string } }) => tc.function.name).join(', ')
      await sendWhatsAppMessage(
        from,
        `Przetwarzam Twoje zapytanie (używam: ${toolNames}). Za chwilę potwierdzę szczegóły.`,
      )
    }

    if (response.content) {
      await supabase.from('chat_messages').insert({
        salon_id: salonId,
        client_id: clientId,
        role: 'assistant',
        content: response.content,
      })

      await sendWhatsAppMessage(from, response.content)
    }
  } catch (error) {
    console.error('LLM error:', error)
    await sendWhatsAppMessage(
      from,
      'Przepraszam, wystąpił błąd. Spróbuj ponownie za chwilę.',
    )
  }
}
