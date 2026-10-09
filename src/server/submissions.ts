import { createServerFn } from '@tanstack/react-start'
import { format, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'
import { createAdminClient } from '../../lib/supabase/admin'
import { getSupabaseServerClient } from '../utils/supabase'
import { getCallerSalonId } from './_salon-resolver'
import { sha256Hex } from './audit'
import { escapeHtml, sendEmail } from './email'

export const getSubmissionsFn = createServerFn({ method: 'GET' })
  .inputValidator((d: { query?: string; clientId?: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller) return { submissions: [] }

    let q = supabase
      .from('submissions')
      .select('*, forms (id, title)')
      .eq('salon_id', caller.salonId)
      .order('created_at', { ascending: false })

    if (data.clientId) q = q.eq('client_id', data.clientId)
    if (data.query) q = q.ilike('client_name', `%${data.query}%`)
    const { data: submissions } = await q
    return { submissions: submissions || [] }
  })

export const getSubmissionFn = createServerFn({ method: 'GET' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller) return { error: 'Nie jesteś zalogowany' }
    const { data: submission, error } = await supabase
      .from('submissions')
      .select('*, forms (id, title, schema), clients (id, name, email, phone)')
      .eq('id', data.id)
      .eq('salon_id', caller.salonId)
      .maybeSingle()
    if (error || !submission) return { error: 'Odpowiedź nie istnieje' }
    return { submission }
  })

export const createSubmissionDocumentUploadFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller) return { error: 'Nie jesteś zalogowany' }
    const { data: row } = await supabase
      .from('submissions')
      .select('id')
      .eq('id', data.id)
      .eq('salon_id', caller.salonId)
      .maybeSingle()
    if (!row) return { error: 'Odpowiedź nie istnieje' }

    const path = `${caller.salonId}/${data.id}.pdf`
    const admin = await createAdminClient()
    const { data: signed, error } = await admin.storage
      .from('submission-documents')
      .createSignedUploadUrl(path)
    if (error || !signed) return { error: 'Nie udało się przygotować wysyłki dokumentu' }
    return { path: signed.path, token: signed.token }
  })

export const saveSubmissionDocumentFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string; path: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller) return { error: 'Nie jesteś zalogowany' }
    if (data.path.split('/')[0] !== caller.salonId) return { error: 'Nieprawidłowa ścieżka' }

    const { data: row } = await supabase
      .from('submissions')
      .select('id')
      .eq('id', data.id)
      .eq('salon_id', caller.salonId)
      .maybeSingle()
    if (!row) return { error: 'Odpowiedź nie istnieje' }

    const admin = await createAdminClient()
    const { data: blob, error: downloadError } = await admin.storage
      .from('submission-documents')
      .download(data.path)
    if (downloadError || !blob) return { error: 'Nie udało się zweryfikować dokumentu' }

    const buffer = Buffer.from(await blob.arrayBuffer())
    if (buffer.subarray(0, 5).toString() !== '%PDF-') {
      await admin.storage.from('submission-documents').remove([data.path])
      return { error: 'Przesłany plik nie jest dokumentem PDF' }
    }

    const pdfSha256 = sha256Hex(buffer)
    const { error: updateError } = await admin
      .from('submissions')
      .update({ pdf_path: data.path, pdf_sha256: pdfSha256 })
      .eq('id', data.id)
    if (updateError) return { error: 'Nie udało się zapisać dokumentu' }

    const { data: signed, error: signError } = await admin.storage
      .from('submission-documents')
      .createSignedUrl(data.path, 3600)
    if (signError || !signed) return { error: 'Nie udało się pobrać dokumentu' }
    return { url: signed.signedUrl }
  })

export const getSubmissionDocumentUrlFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller) return { error: 'Nie jesteś zalogowany' }
    const { data: row } = await supabase
      .from('submissions')
      .select('pdf_path')
      .eq('id', data.id)
      .eq('salon_id', caller.salonId)
      .maybeSingle()
    if (!row?.pdf_path) return { error: 'Brak zapisanego dokumentu' }
    if (row.pdf_path.split('/')[0] !== caller.salonId) return { error: 'Brak dostępu do dokumentu' }

    const admin = await createAdminClient()
    const { data: signed, error } = await admin.storage
      .from('submission-documents')
      .createSignedUrl(row.pdf_path, 3600)
    if (error || !signed) return { error: 'Nie udało się pobrać dokumentu' }
    return { url: signed.signedUrl }
  })

export const sendSubmissionConfirmationFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller) return { error: 'Nie jesteś zalogowany' }

    const { data: submission } = await supabase
      .from('submissions')
      .select(
        'id, client_name, client_email, created_at, signed_at, form_title, pdf_path, forms (title)',
      )
      .eq('id', data.id)
      .eq('salon_id', caller.salonId)
      .maybeSingle()
    if (!submission) return { error: 'Odpowiedź nie istnieje' }
    if (!submission.client_email) return { error: 'Klient nie ma adresu e-mail' }

    const { data: salon } = await supabase
      .from('salons')
      .select('name, phone, email')
      .eq('id', caller.salonId)
      .maybeSingle()

    const formTitle =
      submission.form_title ?? (submission.forms as { title?: string } | null)?.title ?? 'Formularz'
    const dateLabel = format(
      parseISO(submission.signed_at ?? submission.created_at),
      'd MMMM yyyy, HH:mm',
      {
        locale: pl,
      },
    )

    let attachments: { filename: string; content: string }[] | undefined
    if (submission.pdf_path && submission.pdf_path.split('/')[0] === caller.salonId) {
      const admin = await createAdminClient()
      const { data: blob } = await admin.storage
        .from('submission-documents')
        .download(submission.pdf_path)
      if (blob) {
        attachments = [
          {
            filename: `docvue-${formTitle.slice(0, 40).replace(/[^a-zA-Z0-9]+/g, '-')}.pdf`,
            content: Buffer.from(await blob.arrayBuffer()).toString('base64'),
          },
        ]
      }
    }

    const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1b1c1c">
      <h1 style="font-size:20px;margin:0 0 4px">Potwierdzenie wypełnienia formularza</h1>
      <p style="color:#6f5957;font-size:13px;margin:0 0 20px">
        ${submission.client_name ? `${escapeHtml(submission.client_name)} · ` : ''}${escapeHtml(salon?.name ?? 'Gabinet')}
      </p>
      <p style="font-size:14px;margin:0 0 8px">
        Formularz <strong>${escapeHtml(formTitle)}</strong> został wypełniony i podpisany.
      </p>
      <p style="font-size:13px;color:#6f5957;margin:0">
        Data: ${escapeHtml(dateLabel)}
      </p>
      ${
        attachments
          ? '<p style="font-size:13px;color:#6f5957;margin-top:12px">W załączniku znajdziesz zapisany dokument PDF z chwili podpisania.</p>'
          : ''
      }
      <p style="font-size:13px;color:#6f5957;margin-top:20px">
        W razie pytań skontaktuj się z gabinetem${salon?.phone ? `: ${escapeHtml(salon.phone)}` : ''}.
      </p>
    </div>`

    const result = await sendEmail({
      to: submission.client_email,
      subject: `Potwierdzenie wypełnienia formularza — ${formTitle}`,
      html,
      attachments,
    })
    if (!result.ok) return { error: result.error }
    return { success: true }
  })

export const deleteSubmissionFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const caller = await getCallerSalonId(supabase)
    if (!caller?.isOwner) return { error: 'Brak uprawnień' }

    // Usuń także migawkę PDF ze storage (jeśli istnieje).
    const { data: row } = await supabase
      .from('submissions')
      .select('pdf_path')
      .eq('id', data.id)
      .eq('salon_id', caller.salonId)
      .maybeSingle()
    if (row?.pdf_path) {
      const admin = await createAdminClient()
      await admin.storage.from('submission-documents').remove([row.pdf_path])
    }

    const { error } = await supabase
      .from('submissions')
      .delete()
      .eq('id', data.id)
      .eq('salon_id', caller.salonId)
    if (error) return { error: error.message }
    return { success: true }
  })

// Legacy aliases
export const deleteSubmission = (id: string) => deleteSubmissionFn({ data: { id } })
