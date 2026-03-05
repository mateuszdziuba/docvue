import { getClientFormByToken } from '@/actions/client-forms'
import { TokenFormClient } from '@/components/token-form-client'
import { DocvueLogo } from '@/components/ui/docvue-logo'

interface Props {
  params: Promise<{ token: string }>
}

export default async function PublicFormPage({ params }: Props) {
  const { token } = await params

  const result = await getClientFormByToken(token)

  if (result.error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-secondary">
            {result.completed ? (
              <svg className="w-7 h-7 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-7 h-7 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {result.completed ? 'Formularz już wypełniony' : 'Nieprawidłowy link'}
            </h1>
            <p className="text-muted-foreground text-sm mt-1.5 leading-relaxed">
              {result.completed
                ? 'Ten formularz został już wcześniej wypełniony. Dziękujemy!'
                : 'Link do formularza jest nieprawidłowy lub wygasł. Skontaktuj się z gabinetem.'}
            </p>
          </div>
          <div className="pt-4">
            <DocvueLogo className="text-sm" />
          </div>
        </div>
      </div>
    )
  }

  const clientForm = result.clientForm!
  const form = clientForm.forms

  if (!form) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-secondary">
            <svg className="w-7 h-7 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Formularz niedostępny</h1>
            <p className="text-muted-foreground text-sm mt-1.5">Nie udało się załadować danych formularza.</p>
          </div>
        </div>
      </div>
    )
  }

  const client = clientForm.clients

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border/50">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
          <DocvueLogo className="text-lg" />
          {client && (
            <span className="text-xs text-muted-foreground">
              dla: <span className="font-medium text-foreground">{client.name}</span>
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-xl mx-auto px-4 py-8 pb-16">
        {/* Form header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-foreground leading-tight">{form.title}</h1>
          {form.description && (
            <p className="text-muted-foreground text-sm mt-2 leading-relaxed">{form.description}</p>
          )}
          {client && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/8 text-primary rounded-full text-xs font-medium">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {client.name}
            </div>
          )}
        </div>

        {/* Form card */}
        <div className="bg-card rounded-2xl border border-border/60 p-5 sm:p-7 shadow-sm">
          <TokenFormClient
            token={token}
            form={form}
            clientName={client?.name}
            filledBy="client"
          />
        </div>

        {/* Footer */}
        <div className="text-center mt-8 flex items-center justify-center gap-1.5 text-xs text-muted-foreground/50">
          <span>Zabezpieczone przez</span>
          <DocvueLogo className="text-xs" />
        </div>
      </div>
    </div>
  )
}
