import {
  createFileRoute,
  Link,
  useRouter,
} from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { registerClientUserFn } from '../server/auth'
import { DocvueLogo } from '@/components/ui/docvue-logo'
import { Button } from '@/components/ui/button'
import { FloatingLabelInput } from '@/components/ui/floating-label-input'

export const Route = createFileRoute('/register-client')({
  component: RegisterClientPage,
})

function RegisterClientPage() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const form = useForm({
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
    onSubmit: async ({ value }) => {
      setServerError(null)

      if (!value.name.trim()) {
        setServerError('Imię i nazwisko jest wymagane')
        return
      }
      if (value.password !== value.confirmPassword) {
        setServerError('Hasła nie są zgodne')
        return
      }
      if (value.password.length < 8) {
        setServerError('Hasło musi mieć co najmniej 8 znaków')
        return
      }

      const result = await registerClientUserFn({
        data: { email: value.email, password: value.password, name: value.name },
      })

      if (result?.error) {
        setServerError(result.error)
      } else {
        setSuccess(true)
      }
    },
  })

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="w-full max-w-sm text-center">
          <DocvueLogo className="text-2xl mb-6 justify-center" />
          <h1 className="font-serif text-2xl font-normal text-foreground tracking-tight mb-3">
            Konto utworzone
          </h1>
          <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
            Sprawdź swoją skrzynkę email, aby potwierdzić rejestrację. Po potwierdzeniu będziesz mógł się zalogować.
          </p>
          <Link to="/login">
            <Button className="w-full" size="lg">
              Przejdź do logowania
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-background">
      <div className="hidden lg:flex lg:w-[42%] bg-panel-surface flex-col justify-between p-14">
        <DocvueLogo className="text-2xl text-panel-on-surface" />

        <blockquote>
          <p className="text-panel-emphasis text-lg font-serif leading-relaxed font-normal">
            &ldquo;Rezerwuj wizyty, wypełniaj formularze i zarządzaj swoimi wizytami &mdash; wszystko w jednym miejscu.&rdquo;
          </p>
          <footer className="mt-5">
            <p className="text-panel-on-surface-secondary text-sm font-medium">docvue</p>
            <p className="text-panel-on-surface-tertiary text-xs mt-0.5">Portal klienta</p>
          </footer>
        </blockquote>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-[360px]">
          <div className="lg:hidden mb-10">
            <DocvueLogo className="text-2xl" />
          </div>

          <div className="mb-8">
            <h1 className="font-serif text-2xl font-normal text-foreground tracking-tight">
              Rejestracja klienta
            </h1>
            <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
              Załóż konto, aby umawiać wizyty online
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              e.stopPropagation()
              void form.handleSubmit()
            }}
            className="space-y-6"
          >
            <form.Field
              name="name"
              validators={{
                onBlur: ({ value }) =>
                  !value ? 'Imię i nazwisko jest wymagane' : undefined,
              }}
            >
              {(field) => (
                <FloatingLabelInput
                  id="name"
                  label="Imię i nazwisko"
                  type="text"
                  autoComplete="name"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
              )}
            </form.Field>

            <form.Field
              name="email"
              validators={{
                onBlur: ({ value }) =>
                  !value ? 'Email jest wymagany' : undefined,
              }}
            >
              {(field) => (
                <FloatingLabelInput
                  id="email"
                  label="Email"
                  type="email"
                  autoComplete="email"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
              )}
            </form.Field>

            <form.Field
              name="password"
              validators={{
                onBlur: ({ value }) =>
                  !value ? 'Hasło jest wymagane' : undefined,
              }}
            >
              {(field) => (
                <FloatingLabelInput
                  id="password"
                  label="Hasło"
                  type="password"
                  autoComplete="new-password"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
              )}
            </form.Field>

            <form.Field
              name="confirmPassword"
              validators={{
                onBlur: ({ value }) =>
                  !value ? 'Potwierdź hasło' : undefined,
              }}
            >
              {(field) => (
                <FloatingLabelInput
                  id="confirmPassword"
                  label="Powtórz hasło"
                  type="password"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
              )}
            </form.Field>

            {serverError && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2.5 border border-destructive/20">
                {serverError}
              </p>
            )}

            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full"
                  size="lg"
                >
                  {isSubmitting ? 'Rejestracja…' : 'Załóż konto'}
                </Button>
              )}
            </form.Subscribe>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-7">
            Masz już konto?{' '}
            <Link to="/login" className="text-foreground font-medium hover:text-primary transition-colors duration-150">
              Zaloguj się
            </Link>
          </p>

          <p className="text-center text-xs text-muted-foreground mt-4">
            Jesteś gabinetem?{' '}
            <Link to="/register" className="text-foreground font-medium hover:text-primary transition-colors duration-150">
              Zarejestruj gabinet
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
