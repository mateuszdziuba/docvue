// WhatsApp Cloud API webhook
// Vercel serverless function (Node.js 18+, ES module)

import { createHmac, timingSafeEqual } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

// Groq API client (OpenAI-compatible)
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

/**
 * Weryfikuje podpis Meta (X-Hub-Signature-256) na surowym body.
 * Bez poprawnego podpisu webhook odrzuca żądanie (403).
 */
function verifyWhatsAppSignature(rawBody, signatureHeader) {
  const secret = process.env.WHATSAPP_APP_SECRET
  if (!secret || !signatureHeader?.startsWith('sha256=')) return false
  const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')
  const provided = signatureHeader.slice('sha256='.length)
  try {
    const expectedBuf = Buffer.from(expected, 'hex')
    const providedBuf = Buffer.from(provided, 'hex')
    if (expectedBuf.length !== providedBuf.length) return false
    return timingSafeEqual(expectedBuf, providedBuf)
  } catch {
    return false
  }
}

async function callGroq(messages, systemPrompt) {
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
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      temperature: 0.7,
      max_tokens: 1024,
    }),
  })

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.status}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

async function sendWhatsApp(to, text) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const token = process.env.WHATSAPP_ACCESS_TOKEN

  if (!phoneNumberId || !token) return

  await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
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
  })
}

const SYSTEM_PROMPT = `Jesteś asystentem w gabinecie kosmetycznym. 
Pomagasz klientom przez WhatsApp. Odpowiadaj zwięźle i po polsku.
Możesz odpowiadać na pytania o zabiegi, terminy, formularze.
Jeśli klient chce umówić wizytę, poproś o email lub numer telefonu.`

export default async function handler(req) {
  const url = new URL(req.url)

  // GET — Meta webhook verification
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')

    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return new Response(challenge, { status: 200 })
    }
    return new Response('Forbidden', { status: 403 })
  }

  // POST — incoming WhatsApp message
  if (req.method === 'POST') {
    try {
      const rawBody = await req.text()
      const signature = req.headers.get('x-hub-signature-256')
      if (!verifyWhatsAppSignature(rawBody, signature)) {
        return new Response('Forbidden', { status: 403 })
      }

      const body = JSON.parse(rawBody)

      // Extract message details
      const entry = body?.entry?.[0]
      const change = entry?.changes?.[0]
      const msg = change?.value?.messages?.[0]

      if (!msg || msg.type !== 'text') {
        return new Response(JSON.stringify({ status: 'ok' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const from = msg.from // sender phone number
      const text = msg.text.body // message text

      // Find client by phone
      const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
      )

      const { data: client } = await supabase
        .from('clients')
        .select('id, name')
        .eq('phone', from)
        .maybeSingle()

      if (!client) {
        await sendWhatsApp(from, 'Nie znaleziono Twojego profilu. Skontaktuj się z gabinetem.')
        return new Response(JSON.stringify({ status: 'ok' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // Get chat history
      const { data: history } = await supabase
        .from('chat_messages')
        .select('role, content')
        .eq('client_id', client.id)
        .order('created_at', { ascending: true })
        .limit(30)

      // Save user message
      await supabase.from('chat_messages').insert({
        salon_id: client.salon_id,
        client_id: client.id,
        role: 'user',
        content: text,
      })

      // Call AI
      const messages = [
        { role: 'user', content: `Klient: ${client.name}. Wiadomość: ${text}` },
        ...(history || []).slice(-10).map((m) => ({
          role: m.role,
          content: m.content,
        })),
      ]

      const reply = await callGroq(messages, SYSTEM_PROMPT)

      // Save AI response
      await supabase.from('chat_messages').insert({
        salon_id: client.salon_id,
        client_id: client.id,
        role: 'assistant',
        content: reply,
      })

      // Send reply
      await sendWhatsApp(from, reply)

      return new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      console.error('WhatsApp webhook error:', error)
      return new Response(JSON.stringify({ status: 'error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  return new Response('Method Not Allowed', { status: 405 })
}
