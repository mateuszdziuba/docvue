import { createFileRoute } from '@tanstack/react-router'
import { CheckCircle2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { DocvueLogo } from '@/components/ui/docvue-logo'

export const Route = createFileRoute('/f/$token_/success')({
  component: FormSuccessPage,
})

interface LastSubmissionInfo {
  formTitle?: string
  clientName?: string | null
}

function FormSuccessPage() {
  const [info, setInfo] = useState<LastSubmissionInfo | null>(null)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('docvue.lastSubmission')
      if (raw) setInfo(JSON.parse(raw) as LastSubmissionInfo)
    } catch {
      setInfo(null)
    }
  }, [])

  const formTitle = info?.formTitle
  const clientName = info?.clientName

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-5 py-12 pt-[calc(3rem+env(safe-area-inset-top))] pb-[calc(3rem+env(safe-area-inset-bottom))]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-32 -right-24 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-secondary/15 blur-3xl" />
      </div>

      <div className="w-full max-w-2xl">
        <div className="rounded-xl border border-border bg-background/70 shadow-[0_10px_30px_rgba(27,28,28,0.1)] backdrop-blur-xl">
          <div className="p-6 text-center sm:p-10">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-container">
              <CheckCircle2 className="h-8 w-8 text-success" aria-hidden="true" />
            </div>

            <h1 className="mt-6 font-serif text-2xl font-normal tracking-tight text-foreground sm:text-3xl">
              Dziękujemy{clientName ? `, ${clientName}` : ''}!
            </h1>

            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
              {formTitle ? (
                <>
                  Formularz <span className="font-medium text-foreground">„{formTitle}"</span>{' '}
                  został pomyślnie wysłany do salonu.
                </>
              ) : (
                'Twój formularz został pomyślnie wysłany do salonu.'
              )}
            </p>

            <div className="mx-auto mt-8 max-w-md rounded-xl bg-primary/5 p-5 text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                Co dalej?
              </p>
              <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-muted-foreground">
                <li>Salon otrzymał Twoje odpowiedzi oraz podpis przed wizytą.</li>
                <li>Skontaktuje się z Tobą, aby potwierdzić szczegóły wizyty.</li>
                <li>W razie pytań zadzwoń lub napisz do salonu przed wizytą.</li>
              </ul>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button
                type="button"
                size="lg"
                onClick={() => window.close()}
                className="min-h-12 text-xs font-semibold uppercase tracking-[0.12em]"
              >
                Zamknij stronę
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Jeśli karta nie zamknęła się automatycznie, zamknij ją ręcznie.
            </p>

            <div className="mt-8 border-t border-border pt-6">
              <DocvueLogo className="text-sm" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
