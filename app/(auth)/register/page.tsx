import { signup } from '@/actions/auth'
import Link from 'next/link'
import { DocvueLogo } from '@/components/ui/docvue-logo'

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex bg-background">
      {/* Left brand panel — desktop only */}
      <div className="hidden lg:flex lg:w-[45%] bg-foreground flex-col justify-between p-12 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative">
          <DocvueLogo className="text-2xl" />
          <p className="text-white/40 text-xs mt-1">dla gabinetów kosmetycznych</p>
        </div>

        <div className="relative space-y-6">
          <div className="space-y-3">
            {[
              { icon: '✓', text: 'Formularze zgód i ankiety online' },
              { icon: '✓', text: 'Podpisy cyfrowe na telefonie klienta' },
              { icon: '✓', text: 'Harmonogram wizyt i zarządzanie klientami' },
              { icon: '✓', text: 'Zdjęcia przed/po zabiegu' },
            ].map((item) => (
              <div key={item.text} className="flex items-start gap-3">
                <span className="text-primary text-sm font-bold mt-0.5">{item.icon}</span>
                <span className="text-white/80 text-sm leading-relaxed">{item.text}</span>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-white/10">
            <p className="text-white/90 text-sm font-medium">14 dni Pro za darmo</p>
            <p className="text-white/40 text-xs mt-0.5">Bez karty kredytowej. Anuluj kiedy chcesz.</p>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative">
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        <div className="w-full max-w-sm relative">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <DocvueLogo className="text-2xl" />
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Zarejestruj gabinet</h1>
            <p className="text-muted-foreground text-sm mt-1.5">Konfiguracja zajmie 2 minuty</p>
          </div>

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
                autoComplete="organization"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all duration-200 text-sm placeholder:text-muted-foreground/60"
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
                autoComplete="email"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all duration-200 text-sm placeholder:text-muted-foreground/60"
                placeholder="kontakt@beautystudio.pl"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-1.5">
                Telefon{' '}
                <span className="text-muted-foreground font-normal text-xs">(opcjonalnie)</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all duration-200 text-sm placeholder:text-muted-foreground/60"
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
                autoComplete="new-password"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all duration-200 text-sm placeholder:text-muted-foreground/60"
                placeholder="Minimum 6 znaków"
              />
            </div>

            <button
              formAction={signup}
              className="w-full py-2.5 bg-foreground text-background font-semibold rounded-xl hover:bg-foreground/90 transition-all duration-200 text-sm mt-2"
            >
              Zarejestruj gabinet
            </button>
          </form>

          <p className="text-muted-foreground text-sm text-center mt-6">
            Masz już konto?{' '}
            <Link href="/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
              Zaloguj się
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
