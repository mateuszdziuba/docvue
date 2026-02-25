'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { DocvueLogo } from '@/components/ui/docvue-logo'

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
}

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
}

export default function Home() {
  return (
    <main className="min-h-screen bg-background relative">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/70 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <DocvueLogo className="text-2xl" />
          <div className="flex items-center gap-2">
            <Link 
              href="/login" 
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground font-medium transition-colors"
            >
              Zaloguj się
            </Link>
            <Link 
              href="/register" 
              className="px-5 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-all duration-300"
            >
              Zarejestruj gabinet
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-28 px-6 relative overflow-hidden">
        {/* Subtle dot pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06]"
          style={{
            backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        
        <motion.div 
          className="max-w-3xl mx-auto text-center relative z-10"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <motion.div variants={fadeUp}>
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-primary/8 text-primary rounded-full text-xs font-semibold tracking-wide uppercase mb-8">
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
              Dla gabinetów kosmetycznych
            </span>
          </motion.div>
          
          <motion.h1 
            className="text-4xl sm:text-5xl md:text-[3.5rem] font-bold text-foreground mb-6 leading-[1.08] tracking-tight"
            variants={fadeUp}
          >
            Formularze, które
            <br />
            <span className="text-primary">robią wrażenie.</span>
          </motion.h1>
          
          <motion.p 
            className="text-lg text-muted-foreground max-w-lg mx-auto mb-10 leading-relaxed"
            variants={fadeUp}
          >
            Twórz profesjonalne zgody i ankiety. Klienci wypełniają online — Ty masz porządek.
          </motion.p>

          <motion.div 
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
            variants={fadeUp}
          >
            <Link 
              href="/register"
              className="group px-7 py-3.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20"
            >
              Rozpocznij za darmo
              <span className="inline-block ml-2 transition-transform duration-300 group-hover:translate-x-1">→</span>
            </Link>
            <Link 
              href="/login"
              className="px-7 py-3.5 bg-secondary text-secondary-foreground font-medium rounded-xl hover:bg-secondary/80 transition-all duration-300"
            >
              Mam już konto
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Bento Feature Grid */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div 
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={stagger}
          >
            <motion.h2 
              className="text-2xl sm:text-3xl font-bold text-foreground mb-3 tracking-tight"
              variants={fadeUp}
            >
              Zaprojektowane dla gabinetów
            </motion.h2>
            <motion.p className="text-muted-foreground" variants={fadeUp}>
              Funkcje, które naprawdę mają znaczenie
            </motion.p>
          </motion.div>

          {/* Asymmetric Bento Layout */}
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-6 gap-4 auto-rows-[180px]"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            variants={stagger}
          >
            {/* Card 1 — Large, spans 4 cols */}
            <motion.div 
              className="md:col-span-4 bg-card rounded-2xl border border-border/60 p-7 flex flex-col justify-between group hover:border-primary/30 transition-colors duration-300 overflow-hidden relative"
              variants={scaleIn}
            >
              <div className="absolute top-0 right-0 w-40 h-40 bg-primary/[0.03] rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">Kreator formularzy</h3>
                <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
                  Buduj formularze przeciągając pola. Tekst, data, podpis, checkbox — wszystko bez kodowania.
                </p>
              </div>
            </motion.div>

            {/* Card 2 — Smaller, spans 2 cols */}
            <motion.div 
              className="md:col-span-2 bg-card rounded-2xl border border-border/60 p-7 flex flex-col justify-between group hover:border-accent/30 transition-colors duration-300"
              variants={scaleIn}
            >
              <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground mb-1">Linki do formularzy</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  SMS, email, messenger — jak chcesz.
                </p>
              </div>
            </motion.div>

            {/* Card 3 — spans 2 cols */}
            <motion.div 
              className="md:col-span-2 bg-card rounded-2xl border border-border/60 p-7 flex flex-col justify-between group hover:border-[hsl(220,50%,50%)]/30 transition-colors duration-300"
              variants={scaleIn}
            >
              <div className="w-10 h-10 rounded-xl bg-[hsl(220,50%,50%)]/10 text-[hsl(220,50%,50%)] flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground mb-1">Podpisy cyfrowe</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Klient podpisuje się na ekranie telefonu.
                </p>
              </div>
            </motion.div>

            {/* Card 4 — Large, spans 4 cols */}
            <motion.div 
              className="md:col-span-4 bg-card rounded-2xl border border-border/60 p-7 flex flex-col justify-between group hover:border-[hsl(150,45%,45%)]/30 transition-colors duration-300 overflow-hidden relative"
              variants={scaleIn}
            >
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-[hsl(150,45%,45%)]/[0.03] rounded-full translate-y-1/2 -translate-x-1/4" />
              <div className="w-10 h-10 rounded-xl bg-[hsl(150,45%,45%)]/10 text-[hsl(150,45%,45%)] flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">Panel z danymi</h3>
                <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
                  Wszystkie odpowiedzi klientów w jednym miejscu. Filtruj, przeglądaj, eksportuj.
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* How It Works — Clean Timeline */}
      <section className="py-24 px-6 border-t border-border/40">
        <div className="max-w-3xl mx-auto">
          <motion.div 
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={stagger}
          >
            <motion.h2 
              className="text-2xl sm:text-3xl font-bold text-foreground mb-3 tracking-tight"
              variants={fadeUp}
            >
              Jak to działa?
            </motion.h2>
            <motion.p className="text-muted-foreground" variants={fadeUp}>
              Trzy kroki — zero komplikacji
            </motion.p>
          </motion.div>

          <motion.div 
            className="space-y-0"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={stagger}
          >
            {[
              { num: '1', title: 'Stwórz formularz', desc: 'Dodaj pola, ustaw kolejność, dodaj pole podpisu. Gotowe w 5 minut.' },
              { num: '2', title: 'Wyślij klientowi', desc: 'Wygeneruj link i wyślij przez SMS lub email. Klient otwiera na telefonie.' },
              { num: '3', title: 'Odbierz odpowiedzi', desc: 'Natychmiast widzisz odpowiedzi i podpisy w swoim panelu.' },
            ].map((step, i) => (
              <motion.div key={step.num} className="flex gap-5 items-start" variants={fadeUp}>
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
                    {step.num}
                  </div>
                  {i < 2 && <div className="w-px h-14 bg-border/60 mt-1" />}
                </div>
                <div className="pb-8">
                  <h3 className="text-base font-semibold text-foreground mb-1">{step.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div 
            className="bg-primary rounded-2xl p-10 md:p-14 text-center text-primary-foreground relative overflow-hidden"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={scaleIn}
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.1),transparent_60%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(255,255,255,0.05),transparent_50%)]" />
            <div className="relative z-10">
              <h2 className="text-2xl sm:text-3xl font-bold mb-4 tracking-tight">
                Gotowy na cyfrowe formularze?
              </h2>
              <p className="text-primary-foreground/75 mb-8 max-w-md mx-auto leading-relaxed">
                Dołącz do gabinetów, które już oszczędzają czas dzięki docvue.
              </p>
              <Link 
                href="/register"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-primary font-semibold rounded-xl hover:bg-white/90 transition-all duration-300 hover:shadow-lg"
              >
                Rozpocznij za darmo
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 border-t border-border/40">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <DocvueLogo className="text-lg" />
          <p className="text-muted-foreground text-xs">
            © 2026 docvue. Wszystkie prawa zastrzeżone.
          </p>
        </div>
      </footer>
    </main>
  )
}
