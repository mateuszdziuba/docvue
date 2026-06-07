import { createFileRoute } from '@tanstack/react-router'
import { DocvueLogo } from '@/components/ui/docvue-logo'

export const Route = createFileRoute('/f/$token_/success')({
  component: FormSuccessPage,
})

function FormSuccessPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-container">
          <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <div className="space-y-2">
          <h1 className="font-serif text-2xl font-normal text-foreground tracking-tight">Dziękujemy!</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Formularz został pomyślnie wypełniony. Możesz zamknąć tę stronę.
          </p>
        </div>

        <div className="pt-4 border-t border-border">
          <DocvueLogo className="text-sm" />
        </div>
      </div>
    </div>
  )
}
