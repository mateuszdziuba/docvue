import { login } from '@/actions/auth'
import Link from 'next/link'
import { DocvueLogo } from '@/components/ui/docvue-logo'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex bg-background">
      {/* Left brand panel — desktop only */}
      <div className="hidden lg:flex lg:w-[45%] bg-foreground flex-col justify-between p-12 relative overflow-hidden">
        {/* Geometric texture */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative">
          <DocvueLogo className="text-2xl" />
          <p className="text-white/40 text-xs mt-1">dla gabinetów kosmetycznych</p>
        </div>

        <div className="relative space-y-8">
          <blockquote>
            <p className="text-white/90 text-lg font-medium leading-relaxed">
              "Klientki wypełniają formularze jeszcze przed wizytą. Wchodzą i od razu zaczynamy zabieg."
            </p>
            <footer className="mt-4">
              <p className="text-white/60 text-sm font-medium">Kasia M.</p>
              <p className="text-white/40 text-xs">Gabinet lashowy, Warszawa</p>
            </footer>
          </blockquote>

          <div className="flex gap-6">
            {[{ value: '500+', label: 'gabinetów' }, { value: '4.9★', label: 'ocena' }].map((s) => (
              <div key={s.label}>
                <p className="text-white text-xl font-bold tabular-nums">{s.value}</p>
                <p className="text-white/40 text-xs">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative">
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              'radial-gradient(circle, currentColor 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        <div className="w-full max-w-sm relative">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <DocvueLogo className="text-2xl" />
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Witaj z powrotem</h1>
            <p className="text-muted-foreground text-sm mt-1.5">Zaloguj się do panelu gabinetu</p>
          </div>

          <form className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all duration-200 text-sm placeholder:text-muted-foreground/60"
                placeholder="twoj@email.pl"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  Hasło
                </label>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all duration-200 text-sm placeholder:text-muted-foreground/60"
                placeholder="••••••••"
              />
            </div>

            <button
              formAction={login}
              className="w-full py-2.5 bg-foreground text-background font-semibold rounded-xl hover:bg-foreground/90 transition-all duration-200 text-sm mt-2"
            >
              Zaloguj się
            </button>
          </form>

          <p className="text-muted-foreground text-sm text-center mt-6">
            Nie masz konta?{' '}
            <Link href="/register" className="text-primary hover:text-primary/80 font-medium transition-colors">
              Zarejestruj gabinet
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
