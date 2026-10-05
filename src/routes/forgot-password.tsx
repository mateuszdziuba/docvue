import { useForm } from '@tanstack/react-form'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DocvueLogo } from '@/components/ui/docvue-logo'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { requestPasswordResetFn } from '../server/auth'

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const [serverError, setServerError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const form = useForm({
    defaultValues: { email: '' },
    onSubmit: async ({ value }) => {
      setServerError(null)
      const result = await requestPasswordResetFn({ data: { email: value.email } })
      if (result && 'error' in result && result.error) {
        setServerError(result.error)
      } else {
        setSent(true)
      }
    },
  })

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-[360px]">
        <div className="mb-10">
          <DocvueLogo className="text-2xl" />
        </div>

        {sent ? (
          <div role="status">
            <h1 className="font-serif text-2xl font-normal text-foreground tracking-tight">
              Sprawdź skrzynkę
            </h1>
            <p className="text-muted-foreground text-sm mt-3 leading-relaxed">
              Jeśli konto z tym adresem istnieje, wysłaliśmy na nie link do zresetowania hasła.
              Link jest ważny przez 60 minut.
            </p>
            <p className="text-center text-sm text-muted-foreground mt-8">
              <Link
                to="/login"
                className="text-foreground font-medium hover:text-primary transition-colors duration-150"
              >
                Wróć do logowania
              </Link>
            </p>
          </div>
        ) : (
          <>
            <h1 className="font-serif text-2xl font-normal text-foreground tracking-tight">
              Zresetuj hasło
            </h1>
            <p className="text-muted-foreground text-sm mt-2 mb-8 leading-relaxed">
              Podaj adres email przypisany do konta — wyślemy link do ustawienia nowego hasła.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                e.stopPropagation()
                void form.handleSubmit()
              }}
              className="space-y-5"
            >
              <form.Field
                name="email"
                validators={{
                  onBlur: ({ value }) => {
                    if (!value.trim()) return 'Email jest wymagany'
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Podaj poprawny adres email'
                    return undefined
                  },
                  onSubmit: ({ value }) => {
                    if (!value.trim()) return 'Email jest wymagany'
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Podaj poprawny adres email'
                    return undefined
                  },
                }}
              >
                {(field) => (
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="kontakt@beautystudio.pl"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      aria-invalid={
                        field.state.meta.isTouched && field.state.meta.errors.length > 0
                          ? true
                          : undefined
                      }
                      aria-describedby={
                        field.state.meta.isTouched && field.state.meta.errors.length > 0
                          ? 'email-error'
                          : undefined
                      }
                    />
                    {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                      <p id="email-error" role="alert" className="text-sm text-destructive">
                        {String(field.state.meta.errors[0])}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              {serverError && (
                <p
                  role="alert"
                  className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2.5 border border-destructive/20"
                >
                  {serverError}
                </p>
              )}

              <form.Subscribe selector={(state) => state.isSubmitting}>
                {(isSubmitting) => (
                  <Button type="submit" disabled={isSubmitting} className="w-full" size="lg">
                    {isSubmitting ? 'Wysyłanie…' : 'Wyślij link do resetu'}
                  </Button>
                )}
              </form.Subscribe>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-7">
              <Link
                to="/login"
                className="text-foreground font-medium hover:text-primary transition-colors duration-150"
              >
                Wróć do logowania
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
