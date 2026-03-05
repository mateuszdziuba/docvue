'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { DocvueLogo } from '@/components/ui/docvue-logo'

const ease = [0.22, 1, 0.36, 1] as const

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } },
}

const scaleIn = {
  hidden: { opacity: 0, scale: 0.97 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.55, ease } },
}

export default function Home() {
  return (
    <main className="min-h-screen bg-background">

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between" style={{ height: '3.75rem' }}>
          <DocvueLogo className="text-xl" />
          <div className="flex items-center gap-1.5">
            <Link
              href="/login"
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground font-medium transition-colors rounded-lg hover:bg-secondary"
            >
              Zaloguj się
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 bg-foreground text-background text-sm font-semibold rounded-lg hover:bg-foreground/90 transition-all duration-200"
            >
              Wypróbuj za darmo
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="pt-36 pb-20 px-6 relative overflow-hidden">
        {/* Grid texture */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[280px] bg-primary/8 rounded-full blur-[80px] pointer-events-none" />

        <motion.div
          className="max-w-2xl mx-auto text-center relative z-10"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <motion.div variants={fadeUp} className="mb-6">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-[11px] font-semibold tracking-widest uppercase">
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
              Dla gabinetów kosmetycznych
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="text-[2.75rem] sm:text-5xl md:text-[3.5rem] font-bold text-foreground leading-[1.06] tracking-tight mb-5"
          >
            Zgody i ankiety
            <br />
            <span className="text-primary">bez papieru.</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="text-base sm:text-lg text-muted-foreground max-w-md mx-auto mb-9 leading-relaxed"
          >
            Stwórz formularz w 5 minut, wyślij link SMS-em — klient podpisuje na telefonie. Ty masz wszystko w jednym miejscu.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Link
              href="/register"
              className="group w-full sm:w-auto px-7 py-3 bg-foreground text-background font-semibold rounded-xl hover:bg-foreground/90 transition-all duration-200 text-sm"
            >
              Zacznij za darmo
              <span className="inline-block ml-2 transition-transform duration-200 group-hover:translate-x-1">→</span>
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-7 py-3 bg-secondary text-secondary-foreground font-medium rounded-xl hover:bg-secondary/80 transition-all duration-200 text-sm"
            >
              Mam już konto
            </Link>
          </motion.div>
        </motion.div>

        {/* Product mockup — browser chrome with form preview */}
        <motion.div
          className="max-w-3xl mx-auto mt-14 relative z-10"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease }}
        >
          <div className="rounded-2xl border border-border/70 bg-card shadow-xl shadow-foreground/[0.06] overflow-hidden">
            {/* Browser bar */}
            <div className="bg-secondary/60 border-b border-border/50 px-4 py-3 flex items-center gap-3">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-border" />
                <span className="w-3 h-3 rounded-full bg-border" />
                <span className="w-3 h-3 rounded-full bg-border" />
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-background/70 rounded-md px-3 py-1 flex items-center gap-2 max-w-xs mx-auto">
                  <svg className="w-3 h-3 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="text-[11px] text-muted-foreground font-mono">docvue.pl/f/anna-kowalska</span>
                </div>
              </div>
            </div>
            {/* Form preview */}
            <div className="bg-background p-6 sm:p-8">
              <div className="max-w-sm mx-auto space-y-5">
                <div>
                  <p className="text-[11px] font-semibold text-primary uppercase tracking-widest mb-1">Gabinet Urody Alicja</p>
                  <h3 className="text-base font-bold text-foreground">Zgoda na zabieg laminacji rzęs</h3>
                  <p className="text-xs text-muted-foreground mt-1">Formularz dla: <strong>Anna Kowalska</strong></p>
                </div>
                <div className="space-y-3.5">
                  <div>
                    <label className="text-xs font-medium text-foreground/80 block mb-1.5">Czy masz uczulenia na kleje cyjanoakrylowe?</label>
                    <div className="flex gap-4">
                      {[{ label: 'Tak', active: false }, { label: 'Nie', active: true }].map((opt) => (
                        <label key={opt.label} className="flex items-center gap-2 cursor-pointer">
                          <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${opt.active ? 'border-primary bg-primary' : 'border-border'}`}>
                            {opt.active && <span className="w-2 h-2 rounded-full bg-white" />}
                          </span>
                          <span className="text-xs text-foreground">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground/80 block mb-1.5">Opis stanu skóry powiek</label>
                    <div className="w-full h-10 rounded-lg border border-border bg-background/50 px-3 flex items-center">
                      <span className="text-xs text-muted-foreground">Brak szczególnych uwag...</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground/80 block mb-1.5">Podpis klienta</label>
                    <div className="w-full h-16 rounded-lg border-2 border-dashed border-border bg-secondary/30 flex items-center justify-center gap-2">
                      <svg className="w-16 h-7 text-muted-foreground/25" viewBox="0 0 64 28" fill="none">
                        <path d="M4 22 C10 8, 14 24, 20 14 S30 4, 36 14 S46 26, 52 16 S58 10, 60 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>
                  <div className="h-9 bg-primary rounded-lg flex items-center justify-center">
                    <span className="text-xs font-semibold text-primary-foreground">Wyślij formularz</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* SOCIAL PROOF BAR */}
      <section className="py-10 px-6 border-y border-border/40 bg-secondary/30">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-20 text-center">
            {[
              { value: '500+', label: 'gabinetów' },
              { value: '12 000+', label: 'wypełnionych formularzy' },
              { value: '4.9★', label: 'ocena użytkowników' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl font-bold text-foreground tabular-nums">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES BENTO */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            className="text-center mb-14"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={stagger}
          >
            <motion.p variants={fadeUp} className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Funkcje</motion.p>
            <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              Wszystko czego potrzebuje gabinet
            </motion.h2>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-12 gap-3"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            variants={stagger}
          >
            {/* Card 1 — Kreator, large */}
            <motion.div
              variants={scaleIn}
              className="md:col-span-7 bg-card border border-border/60 rounded-2xl p-6 flex flex-col gap-4 hover:border-primary/25 transition-colors duration-300"
            >
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <svg className="w-[1.1rem] h-[1.1rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1.5">Kreator formularzy</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Dodaj pola przeciągając je z listy — tekst, data, wybór, podpis cyfrowy. Bez kodowania, gotowe w 5 minut.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-auto">
                {['Tekst', 'Data', 'Wybór', 'Podpis', 'Checkbox', 'Email', 'Telefon'].map((f) => (
                  <span key={f} className="px-2.5 py-0.5 bg-secondary text-secondary-foreground text-[11px] font-medium rounded-md">
                    {f}
                  </span>
                ))}
              </div>
            </motion.div>

            {/* Card 2 — Linki */}
            <motion.div
              variants={scaleIn}
              className="md:col-span-5 bg-card border border-border/60 rounded-2xl p-6 flex flex-col gap-4 hover:border-accent/25 transition-colors duration-300"
            >
              <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center text-accent shrink-0">
                <svg className="w-[1.1rem] h-[1.1rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1.5">Link w sekundę</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Wyślij unikatowy link przez SMS, email albo WhatsApp. Klient otwiera — bez rejestracji.
                </p>
              </div>
              <div className="mt-auto flex items-center gap-2 bg-secondary/60 rounded-lg px-3 py-2">
                <span className="text-xs text-muted-foreground font-mono flex-1 truncate">docvue.pl/f/tw0j-link</span>
                <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">Kopiuj</span>
              </div>
            </motion.div>

            {/* Card 3 — Podpisy */}
            <motion.div
              variants={scaleIn}
              className="md:col-span-5 bg-card border border-border/60 rounded-2xl p-6 flex flex-col gap-4 hover:border-info/25 transition-colors duration-300"
            >
              <div className="w-9 h-9 rounded-xl bg-info/10 flex items-center justify-center text-info shrink-0">
                <svg className="w-[1.1rem] h-[1.1rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1.5">Podpis cyfrowy</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Klient rysuje podpis palcem na ekranie smartfona. Ważna prawnie zgoda zapisana jako obraz.
                </p>
              </div>
              <div className="mt-auto h-12 rounded-lg border-2 border-dashed border-border flex items-center justify-center">
                <svg className="w-20 h-7 text-muted-foreground/25" viewBox="0 0 80 28" fill="none">
                  <path d="M4 20 C12 6, 18 22, 26 12 S38 2, 46 12 S58 24, 66 14 S72 8, 76 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </motion.div>

            {/* Card 4 — Panel, large */}
            <motion.div
              variants={scaleIn}
              className="md:col-span-7 bg-card border border-border/60 rounded-2xl p-6 flex flex-col gap-4 hover:border-success/25 transition-colors duration-300"
            >
              <div className="w-9 h-9 rounded-xl bg-success/10 flex items-center justify-center text-success shrink-0">
                <svg className="w-[1.1rem] h-[1.1rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1.5">Panel odpowiedzi</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Wszystkie zgody i ankiety w jednym miejscu. Przeglądaj, filtruj, eksportuj — pełna historia klienta.
                </p>
              </div>
              <div className="mt-auto space-y-1.5">
                {[
                  { name: 'Anna Kowalska', form: 'Laminacja rzęs' },
                  { name: 'Marta Wiśniewska', form: 'Mezoterapia igłowa' },
                ].map((row) => (
                  <div key={row.name} className="flex items-center gap-3 px-3 py-2 bg-secondary/50 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center text-primary text-[10px] font-bold shrink-0">
                      {row.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-foreground truncate">{row.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{row.form}</p>
                    </div>
                    <span className="text-[10px] font-semibold text-success bg-success/10 px-2 py-0.5 rounded-full shrink-0">Podpisana</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 px-6 bg-secondary/20 border-y border-border/40">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="text-center mb-14"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={stagger}
          >
            <motion.p variants={fadeUp} className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Jak to działa</motion.p>
            <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              Trzy kroki, zero komplikacji
            </motion.h2>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            variants={stagger}
          >
            {[
              {
                step: '01',
                title: 'Stwórz formularz',
                desc: 'Wybierz pola, ustaw kolejność, dodaj podpis. Szablon gotowy w kilka minut — bez pomocy IT.',
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 4v16m8-8H4" />,
              },
              {
                step: '02',
                title: 'Wyślij link klientowi',
                desc: 'Jeden klik — link leci na telefon klienta. Otwiera stronę, wypełnia formularz, podpisuje.',
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />,
              },
              {
                step: '03',
                title: 'Odbierz odpowiedź',
                desc: 'Odpowiedź i podpis trafiają od razu do Twojego panelu. Żadnych skanerów, żadnych teczek.',
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M5 13l4 4L19 7" />,
              },
            ].map((s) => (
              <motion.div
                key={s.step}
                variants={scaleIn}
                className="bg-card border border-border/60 rounded-2xl p-6 flex flex-col gap-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-4xl font-black text-border/50 tabular-nums leading-none">{s.step}</span>
                  <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <svg className="w-[1.1rem] h-[1.1rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24">{s.icon}</svg>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1.5">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* PRICING */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto">
          <motion.div
            className="text-center mb-12"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={stagger}
          >
            <motion.p variants={fadeUp} className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Cennik</motion.p>
            <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              Zacznij za darmo, rozwijaj bez limitów
            </motion.h2>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            variants={stagger}
          >
            {/* Free */}
            <motion.div variants={scaleIn} className="bg-card border border-border/60 rounded-2xl p-6 flex flex-col gap-5">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Start</p>
                <p className="text-3xl font-bold text-foreground">0 zł</p>
                <p className="text-xs text-muted-foreground mt-0.5">na zawsze</p>
              </div>
              <ul className="space-y-2.5 flex-1">
                {['3 aktywne formularze', 'Do 50 odpowiedzi / mies.', 'Podpisy cyfrowe', 'Panel odpowiedzi'].map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-foreground/80">
                    <svg className="w-4 h-4 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="w-full py-2.5 bg-secondary text-secondary-foreground text-sm font-semibold rounded-xl hover:bg-secondary/80 transition-colors text-center">
                Zarejestruj się
              </Link>
            </motion.div>

            {/* Pro */}
            <motion.div variants={scaleIn} className="bg-primary rounded-2xl p-6 flex flex-col gap-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-1.5">
                  <p className="text-xs font-semibold text-primary-foreground/70 uppercase tracking-wider">Pro</p>
                  <span className="text-[10px] bg-white/20 text-primary-foreground font-semibold px-2 py-0.5 rounded-full">Popularne</span>
                </div>
                <p className="text-3xl font-bold text-primary-foreground">49 zł</p>
                <p className="text-xs text-primary-foreground/60 mt-0.5">miesięcznie</p>
              </div>
              <ul className="space-y-2.5 flex-1 relative">
                {[
                  'Nieograniczone formularze',
                  'Nieograniczone odpowiedzi',
                  'Harmonogram wizyt',
                  'Zarządzanie klientami',
                  'Zdjęcia przed/po',
                  'Priorytetowe wsparcie',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-primary-foreground/90">
                    <svg className="w-4 h-4 text-primary-foreground/80 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="w-full py-2.5 bg-white text-primary text-sm font-semibold rounded-xl hover:bg-white/90 transition-colors text-center relative">
                Zacznij 14-dniowy trial
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-20 px-6 bg-secondary/20 border-y border-border/40">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="text-center mb-12"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={fadeUp}
          >
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Opinie</p>
            <h2 className="text-2xl font-bold text-foreground tracking-tight">Co mówią właścicielki gabinetów</h2>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            variants={stagger}
          >
            {[
              {
                quote: 'Klientki są zachwycone. Wypełniają formularz wieczorem przed wizytą i wszystko już czeka. Skończyło się przepisywanie z kartki.',
                name: 'Kasia M.',
                role: 'Gabinet lashowy, Warszawa',
              },
              {
                quote: 'Przestałam bać się RODO. Mam zapisane zgody z datą i podpisem — i wiem gdzie to znaleźć kiedy potrzeba.',
                name: 'Aleksandra B.',
                role: 'Salon kosmetyczny, Kraków',
              },
              {
                quote: 'Czas rejestracji klientki skrócił się o połowę. Zamiast wypełniać papier przy recepcji, siadam od razu do zabiegu.',
                name: 'Joanna W.',
                role: 'Studio urody, Poznań',
              },
            ].map((t) => (
              <motion.div
                key={t.name}
                variants={scaleIn}
                className="bg-card border border-border/60 rounded-2xl p-5 flex flex-col gap-4"
              >
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-3.5 h-3.5 text-accent" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed flex-1">"{t.quote}"</p>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-28 px-6">
        <div className="max-w-xl mx-auto text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={stagger}
          >
            <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight mb-4">
              Twój gabinet zasługuje na lepsze narzędzia
            </motion.h2>
            <motion.p variants={fadeUp} className="text-muted-foreground text-base mb-9 leading-relaxed">
              Dołącz do setek gabinetów, które już pracują bez stosu papierów.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/register"
                className="group w-full sm:w-auto px-8 py-3.5 bg-foreground text-background font-semibold rounded-xl hover:bg-foreground/90 transition-all duration-200 text-sm"
              >
                Zacznij za darmo — 14 dni Pro w prezencie
                <span className="inline-block ml-2 transition-transform duration-200 group-hover:translate-x-1">→</span>
              </Link>
            </motion.div>
            <motion.p variants={fadeUp} className="text-xs text-muted-foreground/50 mt-4">
              Bez karty kredytowej. Konfiguracja w 2 minuty.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-10 px-6 border-t border-border/40">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <DocvueLogo className="text-lg" />
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <Link href="#" className="hover:text-foreground transition-colors">Polityka prywatności</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Regulamin</Link>
            <Link href="mailto:hello@docvue.pl" className="hover:text-foreground transition-colors">Kontakt</Link>
          </div>
          <p className="text-muted-foreground text-xs">© 2026 docvue</p>
        </div>
      </footer>
    </main>
  )
}
