import { useForm } from '@tanstack/react-form'
import { createFileRoute, Link, redirect, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DocvueLogo } from '@/components/ui/docvue-logo'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signupFn } from '../server/auth'

export const Route = createFileRoute('/register')({
  beforeLoad: ({ context }) => {
    if (context.user) throw redirect({ to: '/dashboard' })
  },
  component: RegisterPage,
})

function RegisterPage() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: { name: '', email: '', phone: '', password: '' },
    onSubmit: async ({ value }) => {
      setServerError(null)
      const result = await signupFn({
        data: {
          name: value.name,
          email: value.email,
          password: value.password,
          phone: value.phone || undefined,
        },
      })
      if (result && 'error' in result && result.error) {
        setServerError(result.error)
      } else {
        await router.invalidate()
        router.navigate({ to: '/dashboard' })
      }
    },
  })

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-[42%] bg-panel-surface flex-col justify-between p-14">
        <DocvueLogo className="text-2xl text-panel-on-surface" />

        <div className="space-y-8">
          <div className="space-y-4">
            {[
              'Formularze zgód i ankiety online',
              'Podpisy cyfrowe na telefonie klienta',
              'Harmonogram wizyt i zarządzanie klientami',
              'Zdjęcia przed/po zabiegu',
            ].map((text) => (
              <div key={text} className="flex items-start gap-3">
                <svg
                  className="w-4 h-4 text-primary mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-panel-emphasis text-sm leading-relaxed">{text}</span>
              </div>
            ))}
          </div>

          <div className="pt-6 border-t border-white/10">
            <p className="text-panel-emphasis text-sm font-medium">14 dni Pro za darmo</p>
            <p className="text-panel-on-surface-tertiary text-xs mt-1">
              Bez karty kredytowej. Anuluj kiedy chcesz.
            </p>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-[360px]">
          <div className="lg:hidden mb-10">
            <DocvueLogo className="text-2xl" />
          </div>

          <div className="mb-8">
            <h1 className="font-serif text-2xl font-normal text-foreground tracking-tight">
              Zarejestruj gabinet
            </h1>
            <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
              Konfiguracja zajmie 2 minuty
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              e.stopPropagation()
              void form.handleSubmit()
            }}
            className="space-y-5"
          >
            <form.Field
              name="name"
              validators={{
                onBlur: ({ value }) => (!value ? 'Nazwa gabinetu jest wymagana' : undefined),
              }}
            >
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor="salonName">Nazwa gabinetu</Label>
                  <Input
                    id="salonName"
                    type="text"
                    autoComplete="organization"
                    placeholder="Beauty Studio Anna"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    aria-invalid={field.state.meta.errors.length > 0 ? true : undefined}
                    aria-describedby={
                      field.state.meta.errors.length > 0 ? `${field.name}-error` : undefined
                    }
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p
                      id={`${field.name}-error`}
                      role="alert"
                      className="text-sm text-destructive"
                    >
                      {String(field.state.meta.errors[0])}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            <form.Field
              name="email"
              validators={{ onBlur: ({ value }) => (!value ? 'Email jest wymagany' : undefined) }}
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
                    aria-invalid={field.state.meta.errors.length > 0 ? true : undefined}
                    aria-describedby={
                      field.state.meta.errors.length > 0 ? `${field.name}-error` : undefined
                    }
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p
                      id={`${field.name}-error`}
                      role="alert"
                      className="text-sm text-destructive"
                    >
                      {String(field.state.meta.errors[0])}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            <form.Field name="phone">
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor="phone">
                    Telefon <span className="text-muted-foreground font-normal">(opcjonalnie)</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+48 123 456 789"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                </div>
              )}
            </form.Field>

            <form.Field
              name="password"
              validators={{
                onBlur: ({ value }) =>
                  !value
                    ? 'Hasło jest wymagane'
                    : value.length < 8
                      ? 'Hasło musi mieć co najmniej 8 znaków'
                      : undefined,
              }}
            >
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor="password">Hasło</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Min. 8 znaków"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    aria-invalid={field.state.meta.errors.length > 0 ? true : undefined}
                    aria-describedby={
                      field.state.meta.errors.length > 0 ? `${field.name}-error` : undefined
                    }
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p
                      id={`${field.name}-error`}
                      role="alert"
                      className="text-sm text-destructive"
                    >
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
                  {isSubmitting ? 'Tworzenie konta…' : 'Zarejestruj się bezpłatnie'}
                </Button>
              )}
            </form.Subscribe>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-7">
            Masz już konto?{' '}
            <Link
              to="/login"
              className="text-foreground font-medium hover:text-primary transition-colors duration-150"
            >
              Zaloguj się
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
