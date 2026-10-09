'use client'

import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import { AlertTriangle } from 'lucide-react'
import { useState } from 'react'
import { FormRenderer } from '@/components/form-renderer'
import { useRouterCompat } from '@/lib/router-compat'
import { applySalonPlaceholders, type SalonContact } from '@/lib/salon-placeholders'
import { resolveSalonCity } from '@/lib/submission-format'
import { submitClientForm } from '@/src/server/client-forms'
import type { Form, FormField } from '@/types/database'

interface TokenFormClientProps {
  token: string
  form: Form
  clientName?: string
  filledBy?: 'client' | 'staff'
  client?: unknown
  clientForm?: unknown
  salon?: SalonContact | null
}

export function TokenFormClient({
  token,
  form,
  filledBy = 'client',
  clientName,
  client,
  salon = null,
}: TokenFormClientProps) {
  const router = useRouterCompat()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fields: FormField[] = (form.schema as any)?.fields || []
  const countableCount = fields.filter((f) => f.type !== 'separator').length
  const resolvedClientName = clientName ?? (client as { name?: string } | null)?.name

  const handleSubmit = async (formData: Record<string, unknown>) => {
    setIsSubmitting(true)
    setError(null)

    // Find signature field logic
    const fields = (form.schema as any)?.fields || []
    const signatureField = fields.find((f: any) => f.type === 'signature' || f.type === 'Signature')

    // Extract signature from either the custom field or the global fallback field
    const signatureValue =
      signatureField && formData[signatureField.name]
        ? formData[signatureField.name]
        : formData.signature

    // Remove the global signature from formData JSON if it exists there
    const cleanFormData = { ...formData }
    if (cleanFormData.signature !== undefined && !signatureField) {
      delete cleanFormData.signature
    }

    // Migawka PDF generowana w przeglądarce (serwerowy render nie działa
    // w bundlu produkcyjnym) i zapisywana przez serwer przy podpisaniu.
    let pdfBase64: string | undefined
    try {
      const [{ pdf }, { SubmissionPdf, registerPdfFonts }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/admin/submission-pdf'),
      ])
      registerPdfFonts(window.location.origin)
      const blob = await pdf(
        <SubmissionPdf
          formTitle={form.title}
          clientName={resolvedClientName ?? null}
          createdAtLabel={format(new Date(), 'd MMMM yyyy, HH:mm', { locale: pl })}
          salon={salon}
          salonCity={resolveSalonCity(salon)}
          fields={fields}
          data={cleanFormData}
          signature={(signatureValue as string) || null}
        />,
      ).toBlob()
      pdfBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
        reader.onerror = () => reject(new Error('Nie udało się odczytać PDF'))
        reader.readAsDataURL(blob)
      })
    } catch {
      // Bez migawki — zgoda i ślad audytowy i tak zostaną zapisane.
      pdfBase64 = undefined
    }

    const result = await submitClientForm({
      token,
      formData: cleanFormData,
      filledBy,
      signature: (signatureValue as string) || undefined,
      pdfBase64,
    })

    if ('error' in result && result.error) {
      setError(result.error)
      setIsSubmitting(false)
      return
    }

    try {
      sessionStorage.setItem(
        'docvue.lastSubmission',
        JSON.stringify({
          formTitle: form.title,
          clientName: resolvedClientName ?? null,
          filledBy,
          source: filledBy === 'staff' ? 'salon' : 'client',
        }),
      )
    } catch {
      // sessionStorage may be unavailable (private mode) — the success page has fallbacks.
    }
    router.replace(`/f/${token}/success`)
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-10 sm:py-16">
      <div className="rounded-xl border border-border bg-background/70 shadow-[0_10px_30px_rgba(27,28,28,0.1)] backdrop-blur-xl">
        <div className="p-6 sm:p-8">
          <header className="mb-8 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
              Formularz przed wizytą
            </p>
            <h1 className="font-serif text-2xl font-normal tracking-tight text-foreground sm:text-3xl">
              {applySalonPlaceholders(form.title, salon)}
            </h1>
            {form.description && (
              <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                {applySalonPlaceholders(form.description, salon)}
              </p>
            )}
            {salon?.name && (
              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                {salon.name}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              {resolvedClientName && (
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                  {resolvedClientName}
                </span>
              )}
              {countableCount > 0 && (
                <span className="rounded-full bg-secondary-container px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-on-primary-container">
                  {countableCount}{' '}
                  {countableCount === 1 ? 'pole do wypełnienia' : 'pól do wypełnienia'}
                </span>
              )}
            </div>
          </header>

          {error && (
            <div
              role="alert"
              className="mb-6 flex items-start gap-2.5 rounded-xl border border-destructive/25 bg-destructive/10 p-4 text-sm leading-relaxed text-destructive"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <FormRenderer
            form={form}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            salon={salon}
          />
        </div>
      </div>
    </div>
  )
}
