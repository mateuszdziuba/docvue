import { DocvueLogo } from '@/components/ui/docvue-logo'

export default function FormSuccessPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-sm w-full text-center">
        {/* Success Icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[hsl(150,45%,45%)]/10 text-[hsl(150,45%,45%)] mb-6">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-3">
          Dziękujemy!
        </h1>
        <p className="text-muted-foreground mb-8">
          Formularz został pomyślnie wypełniony i zapisany.
        </p>

        <p className="text-sm text-muted-foreground/60">
          Możesz teraz zamknąć tę stronę.
        </p>

        {/* Footer */}
        <div className="mt-12 text-xs text-muted-foreground">
          Powered by{' '}
          <DocvueLogo className="text-xs inline-flex" />
        </div>
      </div>
    </div>
  )
}
