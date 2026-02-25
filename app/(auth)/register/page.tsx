import { signup } from '@/actions/auth'
import Link from 'next/link'
import { DocvueLogo } from '@/components/ui/docvue-logo'

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="bg-card rounded-xl border border-border/60 p-8">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-foreground">Zarejestruj Gabinet</h1>
            <p className="text-muted-foreground text-sm mt-1">Utwórz konto dla swojego salonu</p>
          </div>

          {/* Register Form */}
          <form className="space-y-4">
            <div>
              <label htmlFor="salonName" className="block text-sm font-medium text-foreground mb-1.5">
                Nazwa gabinetu
              </label>
              <input
                id="salonName"
                name="salonName"
                type="text"
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-ring/40 focus:border-primary outline-none transition-all text-sm"
                placeholder="Beauty Studio Anna"
              />
            </div>

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
                placeholder="kontakt@beautystudio.pl"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-1.5">
                Telefon <span className="text-muted-foreground font-normal">(opcjonalnie)</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-ring/40 focus:border-primary outline-none transition-all text-sm"
                placeholder="+48 123 456 789"
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
                minLength={6}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-ring/40 focus:border-primary outline-none transition-all text-sm"
                placeholder="Minimum 6 znaków"
              />
            </div>

            <button
              formAction={signup}
              className="w-full py-2.5 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors text-sm"
            >
              Zarejestruj gabinet
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-muted-foreground text-sm">
              Masz już konto?{' '}
              <Link href="/login" className="text-primary hover:text-primary/80 font-medium">
                Zaloguj się
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
