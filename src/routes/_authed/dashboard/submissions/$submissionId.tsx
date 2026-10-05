import { createFileRoute, Link, notFound, useNavigate } from '@tanstack/react-router'
import { format, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'
import { Download, Printer } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { normalizeFieldType } from '@/lib/form-validation'
import { applySalonPlaceholders, type SalonContact } from '@/lib/salon-placeholders'
import { formatFieldValue, isImageSignature, resolveSalonCity } from '@/lib/submission-format'
import { useInvalidateOnFocus } from '@/lib/use-invalidate-on-focus'
import { getSalonFn } from '@/src/server/settings'
import { deleteSubmissionFn, getSubmissionFn } from '@/src/server/submissions'
import type { FormField } from '@/types/database'

export const Route = createFileRoute('/_authed/dashboard/submissions/$submissionId')({
  loader: async ({ params, context }) => {
    const { isOwner } = context as { isOwner?: boolean }
    const [result, salon] = await Promise.all([
      getSubmissionFn({ data: { id: params.submissionId } }),
      getSalonFn(),
    ])
    if (result.error || !result.submission) throw notFound()
    return { submission: result.submission, isOwner: isOwner ?? false, salon }
  },
  component: SubmissionDetailPage,
})

function SubmissionDetailPage() {
  useInvalidateOnFocus()
  const { submission, isOwner, salon } = Route.useLoaderData()
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const sub = submission as any
  const fields: FormField[] = (sub.forms?.schema as { fields?: FormField[] })?.fields ?? []
  const salonContact = salon as SalonContact | null
  const salonCity = resolveSalonCity(salonContact)

  async function handleDownloadPdf() {
    setPdfLoading(true)
    try {
      const [{ pdf }, { SubmissionPdf }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/admin/submission-pdf'),
      ])
      const blob = await pdf(
        <SubmissionPdf
          formTitle={applySalonPlaceholders(sub.forms?.title ?? 'Formularz', salonContact)}
          clientName={sub.client_name ?? null}
          createdAtLabel={format(parseISO(sub.created_at), 'd MMMM yyyy, HH:mm', { locale: pl })}
          salon={salonContact}
          salonCity={salonCity}
          fields={fields}
          data={sub.data}
          signature={sub.signature ?? null}
        />,
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const slug = (value: string) =>
        value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 40)
      link.href = url
      link.download = `docvue-${slug(sub.forms?.title ?? 'formularz')}-${slug(sub.client_name ?? 'klient')}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Nie udało się wygenerować PDF')
    } finally {
      setPdfLoading(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    const result = await deleteSubmissionFn({ data: { id: sub.id } })
    if (result?.error) {
      toast.error(result.error)
      setDeleting(false)
      return
    }
    toast.success('Odpowiedź usunięta')
    navigate({ to: '/dashboard/submissions' })
  }

  const questionNumbers = new Map<string, number>()
  {
    let index = 0
    for (const field of fields) {
      const type = normalizeFieldType(field.type)
      if (type === 'separator' || type === 'info' || type === 'signature') continue
      index += 1
      questionNumbers.set(field.name, index)
    }
  }

  const answeredFields = fields
    .map((field) => {
      const baseLabel = applySalonPlaceholders(field.label, salonContact).replace(
        /^\s*\d{1,2}\s*[.)]\s+/,
        '',
      )
      const number = questionNumbers.get(field.name)
      return {
        field,
        label: number ? `${number}. ${baseLabel}` : baseLabel,
        value: formatFieldValue(field, sub.data?.[field.name]),
      }
    })
    .filter((entry) => entry.value !== null)

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 print:max-w-none print:p-0 print:space-y-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print-hidden">
        <Link
          to="/dashboard/submissions"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Odpowiedzi
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Drukuj
          </Button>
          <Button size="sm" onClick={() => void handleDownloadPdf()} disabled={pdfLoading}>
            <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {pdfLoading ? 'Generowanie…' : 'Pobierz PDF'}
          </Button>
          {isOwner && (
            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={deleting}>
                  {deleting ? 'Usuwanie…' : 'Usuń'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Usuń odpowiedź</AlertDialogTitle>
                  <AlertDialogDescription>
                    Czy na pewno chcesz usunąć tę odpowiedź? Tej operacji nie można cofnąć.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleting}>Anuluj</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(event) => {
                      event.preventDefault()
                      void handleDelete()
                    }}
                    disabled={deleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleting ? 'Usuwanie…' : 'Usuń'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <article className="print-document bg-card rounded-lg border border-border p-6 sm:p-8 space-y-6">
        <header className="space-y-1 border-b border-border pb-5">
          {salon?.name && <p className="font-serif text-xl text-foreground">{salon.name}</p>}
          {(salon?.address || salon?.phone || salon?.email) && (
            <p className="text-xs text-muted-foreground">
              {[salonContact?.address, salonContact?.phone, salonContact?.email]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
          <h1 className="pt-3 font-serif text-lg text-foreground">
            {applySalonPlaceholders(sub.forms?.title ?? 'Formularz', salonContact)}
          </h1>
          <p className="text-sm text-muted-foreground">
            {sub.client_name ?? 'Anonim'} ·{' '}
            {format(parseISO(sub.created_at), 'd MMMM yyyy, HH:mm', { locale: pl })}
          </p>
        </header>

        <dl className="divide-y divide-border/70">
          {answeredFields.map(({ field, label, value }) => {
            // Krótkie odpowiedzi (Tak/Nie, liczby) nie zabierają miejsca pytaniu.
            const shortAnswer = value !== null && value.length <= 24
            return (
              <div
                key={field.name}
                className={`grid break-inside-avoid grid-cols-1 gap-1 py-3 sm:gap-4 ${
                  shortAnswer
                    ? 'sm:grid-cols-[minmax(0,1fr)_auto]'
                    : 'sm:grid-cols-[minmax(0,18rem)_1fr]'
                }`}
              >
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {label}
                </dt>
                <dd
                  className={`whitespace-pre-line text-sm leading-relaxed text-foreground ${
                    shortAnswer ? 'sm:min-w-[4rem] sm:pl-6' : ''
                  }`}
                >
                  {value}
                </dd>
              </div>
            )
          })}
          {answeredFields.length === 0 && (
            <p className="py-3 text-sm text-muted-foreground">Brak odpowiedzi w formularzu.</p>
          )}
        </dl>

        <section className="break-inside-avoid border-t border-border pt-8">
          <div className="flex flex-col-reverse gap-8 sm:flex-row sm:items-end sm:justify-between print:flex-row print:items-end print:justify-between">
            <p className="text-sm text-foreground">
              {salonCity ? `${salonCity}, ` : ''}
              {format(parseISO(sub.created_at), 'd MMMM yyyy', { locale: pl })}
            </p>
            <div className="w-full text-center sm:ml-auto sm:w-72 print:ml-auto print:w-72">
              {sub.signature ? (
                isImageSignature(sub.signature) ? (
                  <img
                    src={sub.signature}
                    alt="Podpis klienta"
                    referrerPolicy="no-referrer"
                    className="mx-auto max-h-24 bg-white object-contain"
                  />
                ) : (
                  <p className="font-serif text-xl italic text-foreground">{sub.signature}</p>
                )
              ) : (
                <div className="h-16" aria-hidden="true" />
              )}
              <div className="mt-2 border-t border-foreground/40 pt-1.5">
                <p className="text-xs text-muted-foreground">
                  Podpis klienta{sub.client_name ? ` — ${sub.client_name}` : ''}
                </p>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-border pt-4 text-xs text-muted-foreground">
          Dokument wygenerowany z systemu docvue ·{' '}
          {format(new Date(), 'd MMMM yyyy, HH:mm', { locale: pl })}
        </footer>
      </article>
    </div>
  )
}
