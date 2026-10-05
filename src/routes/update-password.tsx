import { useForm } from '@tanstack/react-form'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DocvueLogo } from '@/components/ui/docvue-logo'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { changePasswordFn, exchangeRecoveryCodeFn, fetchUserFn } from '../server/auth'

type UpdatePasswordSearch = { code?: string }

export const Route = createFileRoute('/update-password')({
  validateSearch: (search: Record<string, unknown>): UpdatePasswordSearch => ({
    code: typeof search.code === 'string' ? search.code : undefined,
  }),
  beforeLoad: async ({ search }) => {
    if (search.code) {
      const result = await exchangeRecoveryCodeFn({ data: { code: search.code } })
      if (!result || 'error' in result) {
        throw redirect({ to: '/forgot-password' })
      }
    }
  },
  loader: async () => await fetchUserFn(),
  component: UpdatePasswordPage,
})

function UpdatePasswordPage() {
  const user = Route.useLoaderData()
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const form = useForm({
    defaultValues: { password: '', confirmPassword: '' },
    onSubmit: async ({ value }) => {
      setServerError(null)
      if (value.password.length < 8) {
        setServerError('Hasło musi mieć co najmniej 8 znaków')
        return
      }
      if (value.password !== value.confirmPassword) {
        setServerError('Hasła nie są zgodne')
        return
      }
      const result = await changePasswordFn({ data: { password: value.password } })
      if (result && 'error' in result && result.error) {
        setServerError(result.error)
      } else {
        setSuccess(true)
      }
    },
  })

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="w-full max-w-[360px]">
          <DocvueLogo className="text-2xl mb-10" />
          <h1 className="font-serif text-2xl font-normal text-foreground tracking-tight">
            Link nieprawidłowy
          </h1>
          <p className="text-muted-foreground text-sm mt-3 leading-relaxed">
            Link do zresetowania hasła jest nieprawidłowy lub wygasł. Poproś o nowy link.
          </p>
          <p className="text-sm text-muted-foreground mt-8">
            <Link
              to="/forgot-password"
              className="text-foreground font-medium hover:text-primary transition-colors duration-150"
            >
              Wyślij nowy link
            </Link>
          </p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="w-full max-w-[360px]" role="status">
          <DocvueLogo className="text-2xl mb-10" />
          <h1 className="font-serif text-2xl font-normal text-foreground tracking-tight">
            Hasło zmienione
          </h1>
          <p className="text-muted-foreground text-sm mt-3 leading-relaxed">
            Możesz teraz zalogować się nowym hasłem.
          </p>
          <p className="text-sm text-muted-foreground mt-8">
            <Link
              to="/login"
              className="text-foreground font-medium hover:text-primary transition-colors duration-150"
            >
              Przejdź do logowania
            </Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-[360px]">
        <div className="mb-10">
          <DocvueLogo className="text-2xl" />
        </div>

        <h1 className="font-serif text-2xl font-normal text-foreground tracking-tight">
          Ustaw nowe hasło
        </h1>
        <p className="text-muted-foreground text-sm mt-2 mb-8 leading-relaxed">
          Nowe hasło musi mieć co najmniej 8 znaków.
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
            name="password"
            validators={{
              onBlur: ({ value }) => {
                if (!value) return 'Hasło jest wymagane'
                if (value.length < 8) return 'Hasło musi mieć co najmniej 8 znaków'
                return undefined
              },
              onSubmit: ({ value }) => {
                if (!value) return 'Hasło jest wymagane'
                if (value.length < 8) return 'Hasło musi mieć co najmniej 8 znaków'
                return undefined
              },
            }}
          >
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor="password">Nowe hasło</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
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
                      ? 'password-error'
                      : undefined
                  }
                />
                {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                  <p id="password-error" role="alert" className="text-sm text-destructive">
                    {String(field.state.meta.errors[0])}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field
            name="confirmPassword"
            validators={{
              onBlur: ({ value, fieldApi }) => {
                if (!value) return 'Potwierdź hasło'
                if (value !== fieldApi.form.getFieldValue('password')) return 'Hasła nie są zgodne'
                return undefined
              },
              onSubmit: ({ value, fieldApi }) => {
                if (!value) return 'Potwierdź hasło'
                if (value !== fieldApi.form.getFieldValue('password')) return 'Hasła nie są zgodne'
                return undefined
              },
            }}
          >
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Powtórz nowe hasło</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
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
                      ? 'confirmPassword-error'
                      : undefined
                  }
                />
                {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                  <p id="confirmPassword-error" role="alert" className="text-sm text-destructive">
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
                {isSubmitting ? 'Zapisywanie…' : 'Zmień hasło'}
              </Button>
            )}
          </form.Subscribe>
        </form>
      </div>
    </div>
  )
}
