'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { DocvueLogo } from '@/components/ui/docvue-logo'

export default function Home() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <main className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/60">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <DocvueLogo className="text-2xl" />
          <div className="flex items-center gap-3">
            <Link 
              href="/login" 
              className="px-4 py-2 text-muted-foreground hover:text-foreground font-medium transition-colors"
            >
              Zaloguj się
            </Link>
            <Link 
              href="/register" 
              className="px-5 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
            >
              Zarejestruj gabinet
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-36 pb-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div
            className={`transition-all duration-600 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          >
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-primary/8 text-primary rounded-full text-sm font-medium mb-8">
              <span className="w-1.5 h-1.5 bg-primary rounded-full" />
              Dla gabinetów kosmetycznych
            </span>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground mb-6 leading-[1.1] tracking-tight">
              Formularze dla Twojego gabinetu{' '}
              <span className="text-primary">beauty</span>
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
              Twórz profesjonalne formularze zgód, ankiety i dokumenty. 
              Klienci wypełniają je online, a Ty masz wszystko w jednym miejscu.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link 
                href="/register"
                className="group px-7 py-3.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors"
              >
                Rozpocznij za darmo
                <span className="inline-block ml-2 transition-transform group-hover:translate-x-0.5">→</span>
              </Link>
              <Link 
                href="/login"
                className="px-7 py-3.5 bg-secondary text-secondary-foreground font-semibold rounded-lg hover:bg-secondary/80 transition-colors"
              >
                Mam już konto
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 border-t border-border/40">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
              Wszystko czego potrzebujesz
            </h2>
            <p className="text-muted-foreground">
              Proste narzędzia dla profesjonalnych gabinetów
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="group p-6 bg-card rounded-xl border border-border/60 hover:border-primary/30 transition-colors">
              <div className="w-11 h-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-5">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Kreator formularzy
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Twórz formularze metodą przeciągnij i upuść. Bez kodowania, bez komplikacji.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group p-6 bg-card rounded-xl border border-border/60 hover:border-primary/30 transition-colors">
              <div className="w-11 h-11 rounded-lg bg-[hsl(220,50%,50%)]/10 text-[hsl(220,50%,50%)] flex items-center justify-center mb-5">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Udostępnianie linkiem
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Wyślij link klientowi — wypełni formularz na telefonie lub komputerze.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group p-6 bg-card rounded-xl border border-border/60 hover:border-primary/30 transition-colors">
              <div className="w-11 h-11 rounded-lg bg-[hsl(150,45%,45%)]/10 text-[hsl(150,45%,45%)] flex items-center justify-center mb-5">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Odpowiedzi w jednym miejscu
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Wszystkie odpowiedzi klientów zebrane i uporządkowane w Twoim panelu.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 border-t border-border/40">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
              Jak to działa?
            </h2>
            <p className="text-muted-foreground">
              Trzy proste kroki do cyfrowych formularzy
            </p>
          </div>

          <div className="space-y-0">
            {[
              { num: '1', title: 'Stwórz formularz', desc: 'Dodaj pola tekstowe, checkboxy, daty — co tylko potrzebujesz.' },
              { num: '2', title: 'Wyślij klientowi', desc: 'Udostępnij link przez SMS, email lub messenger.' },
              { num: '3', title: 'Odbierz odpowiedzi', desc: 'Klient wypełnia, Ty otrzymujesz natychmiast w panelu.' },
            ].map((step, i) => (
              <div key={step.num} className="flex gap-5 items-start">
                {/* Timeline */}
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
                    {step.num}
                  </div>
                  {i < 2 && <div className="w-px h-16 bg-border/60 mt-1" />}
                </div>
                {/* Content */}
                <div className="pb-10">
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="bg-primary rounded-2xl p-10 md:p-14 text-center text-primary-foreground relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.08),transparent_60%)]" />
            <div className="relative z-10">
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">
                Gotowy na cyfrową rewolucję?
              </h2>
              <p className="text-primary-foreground/80 mb-8 max-w-lg mx-auto">
                Dołącz do setek gabinetów, które już korzystają z docvue. 
                Zacznij za darmo już dziś!
              </p>
              <Link 
                href="/register"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-primary font-semibold rounded-lg hover:bg-white/90 transition-colors"
              >
                Rozpocznij za darmo
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 border-t border-border/40">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <DocvueLogo className="text-lg" />
          <p className="text-muted-foreground text-sm">
            © 2026 docvue. Wszystkie prawa zastrzeżone.
          </p>
        </div>
      </footer>
    </main>
  )
}
