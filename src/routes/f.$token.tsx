import { createFileRoute } from '@tanstack/react-router'
import { CheckCircle2, EyeOff } from 'lucide-react'
import { z } from 'zod'
import { TokenFormClient } from '@/components/token-form-client'
import { DocvueLogo } from '@/components/ui/docvue-logo'
import { getClientFormByTokenFn } from '@/src/server/client-forms'

export const Route = createFileRoute('/f/$token')({
  validateSearch: z.object({
    // ?source=salon — formularz wypełniany na urządzeniu w gabinecie
    source: z.enum(['salon']).optional(),
  }),
  loader: async ({ params }) => {
    const result = await getClientFormByTokenFn({
      data: { token: params.token },
    })
    return result
  },
  component: PublicFormPage,
})

function ErrorState({ completed }: { completed?: boolean }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-4 text-center">
        <div
          className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ${
            completed ? 'bg-primary-container' : 'bg-secondary'
          }`}
        >
          {completed ? (
            <CheckCircle2 className="h-7 w-7 text-success" />
          ) : (
            <EyeOff className="h-7 w-7 text-muted-foreground" />
          )}
        </div>
        <div>
          <h1 className="font-serif text-xl font-normal tracking-tight text-foreground">
            {completed ? 'Formularz już wypełniony' : 'Nieprawidłowy link'}
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {completed
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

function PublicFormPage() {
  const data = Route.useLoaderData()
  const { token } = Route.useParams()
  const { source } = Route.useSearch()

  if ('error' in data && data.error) {
    return <ErrorState completed={'completed' in data ? data.completed : undefined} />
  }

  if (!('clientForm' in data) || !data.clientForm) {
    return <ErrorState />
  }

  const clientForm = data.clientForm
  const form = clientForm.forms as any

  if (!form) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm space-y-4 text-center">
          <h1 className="font-serif text-xl font-normal tracking-tight text-foreground">
            Formularz niedostępny
          </h1>
          <DocvueLogo className="text-sm" />
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-32 -right-24 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-secondary/15 blur-3xl" />
      </div>
      <TokenFormClient
        token={token}
        form={form}
        filledBy={source === 'salon' ? 'staff' : 'client'}
        clientName={(clientForm.clients as any)?.name}
        client={clientForm.clients as any}
        clientForm={clientForm}
        salon={(data as { salon?: unknown }).salon as never}
      />
    </div>
  )
}
