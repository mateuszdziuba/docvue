import { createFileRoute } from '@tanstack/react-router'
import { getClientFormByTokenFn } from '@/src/server/client-forms'
import { TokenFormClient } from '@/components/token-form-client'
import { DocvueLogo } from '@/components/ui/docvue-logo'

export const Route = createFileRoute('/f/$token')({
  loader: async ({ params }) => {
    const result = await getClientFormByTokenFn({
      data: { token: params.token },
    })
    return result
  },
  component: PublicFormPage,
})

function PublicFormPage() {
  const data = Route.useLoaderData()
  const { token } = Route.useParams()

  if (data.error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-secondary">
            {(data as any).completed ? (
              <svg
                className="w-7 h-7 text-(--color-success)"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ) : (
              <svg
                className="w-7 h-7 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                />
              </svg>
            )}
          </div>
          <div>
            <h1 className="font-serif text-xl font-normal text-foreground tracking-tight">
              {(data as any).completed
                ? 'Formularz już wypełniony'
                : 'Nieprawidłowy link'}
            </h1>
            <p className="text-muted-foreground text-sm mt-1.5 leading-relaxed">
              {(data as any).completed
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

  const clientForm = data.clientForm!
  const form = clientForm.forms as any

  if (!form) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm text-center space-y-4">
          <h1 className="font-serif text-xl font-normal text-foreground tracking-tight">
            Formularz niedostępny
          </h1>
          <DocvueLogo className="text-sm" />
        </div>
      </div>
    )
  }

  return (
    <TokenFormClient
      token={token}
      form={form}
      client={clientForm.clients as any}
      clientForm={clientForm}
    />
  )
}
