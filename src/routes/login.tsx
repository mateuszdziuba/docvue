import {
  createFileRoute,
  Link,
  redirect,
  useRouter,
} from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { loginFn } from '../server/auth'
import { DocvueLogo } from '@/components/ui/docvue-logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const Route = createFileRoute('/login')({
  beforeLoad: ({ context }) => {
    if (context.user) throw redirect({ to: '/dashboard' })
  },
  component: LoginPage,
})

function LoginPage() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: { email: '', password: '' },
    onSubmit: async ({ value }) => {
      setServerError(null)
      const result = await loginFn({ data: value })
      if (result?.error) {
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

        <div className="space-y-10">
          <blockquote>
            <p className="text-panel-emphasis text-lg font-serif leading-relaxed font-normal">
              &ldquo;Klientki wypełniają formularze jeszcze przed wizytą. Wchodzą i od
              razu zaczynamy zabieg.&rdquo;
            </p>
            <footer className="mt-5">
              <p className="text-panel-on-surface-secondary text-sm font-medium">Kasia M.</p>
              <p className="text-panel-on-surface-tertiary text-xs mt-0.5">Gabinet lashowy, Warszawa</p>
            </footer>
          </blockquote>

          <div className="flex gap-10 pt-6 border-t border-white/10">
            {[
              { value: '500+', label: 'gabinetów' },
              { value: '4.9★', label: 'ocena' },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-panel-emphasis text-2xl font-serif tabular-nums">
                  {s.value}
                </p>
                <p className="text-panel-on-surface-tertiary text-xs mt-1 tracking-[0.1em] uppercase">
                  {s.label}
                </p>
              </div>
            ))}
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
              Witaj z powrotem
            </h1>
            <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
              Zaloguj się do panelu gabinetu
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
              name="email"
              validators={{
                onBlur: ({ value }) =>
                  !value ? 'Email jest wymagany' : undefined,
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
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-xs text-destructive">{field.state.meta.errors[0]}</p>
                  )}
                </div>
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
                <div className="space-y-1.5">
                  <Label htmlFor="password">Hasło</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-xs text-destructive">{field.state.meta.errors[0]}</p>
                  )}
                </div>
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
                  {isSubmitting ? 'Logowanie…' : 'Zaloguj się'}
                </Button>
              )}
            </form.Subscribe>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-7">
            Nie masz konta?{' '}
            <Link to="/register" className="text-foreground font-medium hover:text-primary transition-colors duration-150">
              Zarejestruj gabinet
            </Link>
          </p>
          <p className="text-center text-xs text-muted-foreground mt-3">
            Jesteś klientem?{' '}
            <Link to="/register-client" className="text-foreground font-medium hover:text-primary transition-colors duration-150">
              Załóż konto klienta
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
