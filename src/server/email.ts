/**
 * Wysyłka e-maili transakcyjnych przez Resend (HTTP API, bez dodatkowych zależności).
 * Konfiguracja: RESEND_API_KEY (wymagane), EMAIL_FROM (opcjonalne).
 */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY)
}

export interface EmailAttachment {
  filename: string
  /** base64 (bez prefiksu data:) */
  content: string
}

export interface SendEmailInput {
  to: string
  subject: string
  html: string
  attachments?: EmailAttachment[]
}

export type SendEmailResult = { ok: true } | { ok: false; error: string }

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return {
      ok: false,
      error: 'Wysyłka e-mail nie jest skonfigurowana (brak RESEND_API_KEY).',
    }
  }

  const from = process.env.EMAIL_FROM ?? 'docvue <onboarding@resend.dev>'

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        attachments: input.attachments,
      }),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      return {
        ok: false,
        error: `Wysyłka nie powiodła się (${response.status})${body ? `: ${body.slice(0, 160)}` : ''}`,
      }
    }
    return { ok: true }
  } catch {
    return { ok: false, error: 'Nie udało się połączyć z usługą e-mail' }
  }
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
