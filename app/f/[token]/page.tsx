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
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card rounded-xl p-8 border border-border/60 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-destructive/10 mb-4">
            <svg className="w-6 h-6 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">
            {result.completed ? 'Formularz wypełniony' : 'Nieprawidłowy link'}
          </h1>
          <p className="text-muted-foreground text-sm">
            {result.completed 
              ? 'Ten formularz został już wypełniony. Dziękujemy!'
              : 'Link do formularza jest nieprawidłowy lub wygasł.'}
          </p>
        </div>
      </div>
    )
  }

  const clientForm = result.clientForm!
  const form = clientForm.forms
  
  if (!form) {
      return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card rounded-xl p-8 border border-border/60 text-center">
            <h1 className="text-xl font-bold text-foreground mb-2">
            Formularz niedostępny
            </h1>
            <p className="text-muted-foreground text-sm">
            Nie udało się załadować danych formularza.
            </p>
        </div>
      </div>
      )
  }

  const client = clientForm.clients

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">
            {form.title}
          </h1>
          {form.description && (
            <p className="text-muted-foreground text-sm mt-2">
              {form.description}
            </p>
          )}
          {client && (
            <p className="text-xs text-primary mt-3">
              Formularz dla: <strong>{client.name}</strong>
            </p>
          )}
        </div>

        {/* Form */}
        <div className="bg-card rounded-xl p-6 md:p-8 border border-border/60">
          <TokenFormClient 
            token={token}
            form={form}
            clientName={client?.name}
            filledBy="client"
          />
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-xs text-muted-foreground">
          Powered by{' '}
          <DocvueLogo className="text-xs inline-flex" />
        </div>
      </div>
    </div>
  )
}
