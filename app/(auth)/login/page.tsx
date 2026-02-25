import { login } from '@/actions/auth'
import Link from 'next/link'
import { DocvueLogo } from '@/components/ui/docvue-logo'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="bg-card rounded-xl border border-border/60 p-8">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center mb-4">
              <DocvueLogo className="text-3xl" />
            </div>
            <p className="text-muted-foreground text-sm">Zaloguj się do panelu gabinetu</p>
          </div>

          {/* Login Form */}
          <form className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-ring/40 focus:border-primary outline-none transition-all text-sm"
                placeholder="twoj@email.pl"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">
                Hasło
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-ring/40 focus:border-primary outline-none transition-all text-sm"
                placeholder="••••••••"
              />
            </div>

            <button
              formAction={login}
              className="w-full py-2.5 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors text-sm"
            >
              Zaloguj się
            </button>
          </form>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-muted-foreground text-sm">
              Nie masz konta?{' '}
              <Link href="/register" className="text-primary hover:text-primary/80 font-medium">
                Zarejestruj gabinet
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
