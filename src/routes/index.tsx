import { createFileRoute, Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { Menu } from 'lucide-react'
import { useState } from 'react'
import { DocvueLogo } from '@/components/ui/docvue-logo'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

export const Route = createFileRoute('/')({
  component: LandingPage,
})

// Animation variants
const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: [0.22, 0.9, 0.36, 1], delay },
  }),
}

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.11 } },
}

const staggerItem = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 0.9, 0.36, 1] },
  },
}

const viewportOpts = { once: true, margin: '-60px' } as const

function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const navLinks = [
    { href: '#features', label: 'Funkcje' },
    { href: '#how-it-works', label: 'Jak to działa' },
    { href: '#pricing', label: 'Cennik' },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Nav — ghost until scroll */}
      <header className="fixed top-0 left-0 right-0 z-50 h-[calc(4rem+env(safe-area-inset-top))] flex items-center backdrop-blur-[12px] bg-background/70 border-b border-border/40">
        <div className="max-w-6xl mx-auto px-6 w-full flex items-center justify-between">
          <DocvueLogo className="text-xl" />
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className="hidden sm:block text-sm text-muted-foreground hover:text-foreground transition-colors duration-150 px-4 py-2"
            >
              Zaloguj się
            </Link>
            <Link
              to="/register"
              className="bg-primary text-primary-foreground text-sm px-5 py-2.5 rounded-full font-medium hover:opacity-90 transition-opacity duration-150 whitespace-nowrap"
            >
              Wypróbuj za darmo
            </Link>
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  aria-label="Otwórz menu"
                  className="md:hidden grid h-11 w-11 place-items-center rounded-md text-foreground hover:bg-surface-container transition-colors"
                >
                  <Menu className="h-5 w-5" aria-hidden="true" />
                </button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-72 p-0 pt-[calc(3.5rem+env(safe-area-inset-top))]"
              >
                <SheetHeader className="px-4 pb-2 text-left">
                  <SheetTitle className="font-serif text-lg font-normal">Menu</SheetTitle>
                </SheetHeader>
                <nav aria-label="Menu strony" className="flex flex-col gap-1 px-2 py-2">
                  {navLinks.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center min-h-11 rounded-md px-3 text-sm font-medium text-foreground hover:bg-surface-container transition-colors"
                    >
                      {link.label}
                    </a>
                  ))}
                  <Link
                    to="/login"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center min-h-11 rounded-md px-3 text-sm font-medium text-foreground hover:bg-surface-container transition-colors"
                  >
                    Zaloguj się
                  </Link>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-40 pb-28 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.p
            className="text-xs font-semibold tracking-[0.14em] uppercase text-muted-foreground mb-10"
            variants={fadeUp}
            custom={0}
            initial="hidden"
            animate="visible"
          >
            Oprogramowanie dla gabinetów kosmetycznych
          </motion.p>
          <motion.h1
            className="font-serif text-5xl md:text-6xl font-normal text-foreground leading-[1.15] tracking-[-0.02em] mb-7"
            variants={fadeUp}
            custom={0.1}
            initial="hidden"
            animate="visible"
          >
            Twój gabinet,<br />
            <span className="text-primary">cyfrowo doskonały</span>
          </motion.h1>
          <motion.p
            className="text-base text-muted-foreground leading-relaxed max-w-lg mx-auto mb-10"
            variants={fadeUp}
            custom={0.2}
            initial="hidden"
            animate="visible"
          >
            Twórz formularze zgody, wysyłaj je klientom jednym kliknięciem i zarządzaj wizytami w jednym miejscu.
          </motion.p>
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
            variants={fadeUp}
            custom={0.3}
            initial="hidden"
            animate="visible"
          >
            <Link
              to="/register"
              className="bg-primary text-primary-foreground text-sm px-8 py-3.5 rounded-full font-medium hover:opacity-90 transition-opacity duration-150 w-full sm:w-auto text-center"
            >
              Zacznij za darmo
            </Link>
            <a
              href="#how-it-works"
              className="border border-border text-foreground text-sm px-8 py-3.5 rounded-full font-medium hover:bg-surface-container-low transition-colors duration-150 w-full sm:w-auto text-center"
            >
              Jak to działa?
            </a>
          </motion.div>
        </div>

        {/* Dashboard preview */}
        <motion.div
          className="max-w-5xl mx-auto mt-20"
          initial={{ opacity: 0, y: 36, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.45, ease: [0.22, 0.9, 0.36, 1] }}
        >
          <div className="rounded-xl bg-surface-container-low border border-border overflow-hidden aspect-video flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-xl bg-primary-container mx-auto flex items-center justify-center">
                <svg aria-hidden="true" className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-muted-foreground text-sm">Panel zarządzania docvue</p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="py-14 px-6 border-y border-border/60 bg-surface-container-low">
        <motion.div
          className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOpts}
        >
          {[
            { value: '500+', label: 'Gabinetów' },
            { value: '50k+', label: 'Formularzy miesięcznie' },
            { value: '99.9%', label: 'Dostępność' },
            { value: 'RODO', label: 'Zgodność' },
          ].map((stat) => (
            <motion.div key={stat.label} variants={staggerItem}>
              <p className="font-serif text-3xl md:text-4xl text-foreground mb-1.5">{stat.value}</p>
              <p className="text-xs font-semibold tracking-[0.12em] uppercase text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-16"
            variants={fadeUp}
            custom={0}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOpts}
          >
            <p className="text-xs font-semibold tracking-[0.14em] uppercase text-muted-foreground mb-5">Możliwości</p>
            <h2 className="font-serif text-3xl md:text-4xl font-normal text-foreground tracking-[-0.01em]">
              Wszystko, czego potrzebuje<br />Twój gabinet
            </h2>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-3 gap-6"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOpts}
          >
            {[
              {
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                ),
                title: 'Kreator formularzy',
                desc: 'Twórz profesjonalne formularze zgody, ankiety i dokumenty bez żadnej wiedzy technicznej. 9 typów pól, podpis cyfrowy.',
              },
              {
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                ),
                title: 'Wysyłka jednym kliknięciem',
                desc: 'Wyślij formularz do klienta przez unikalny link SMS lub e-mail. Klient wypełnia na telefonie — bez konta, bez instalacji.',
              },
              {
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                ),
                title: 'Zarządzanie wizytami',
                desc: 'Pełny widok kalendarza, przypisywanie formularzy do zabiegów i automatyczne śledzenie statusu zgody przed wizytą.',
              },
              {
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                ),
                title: 'Baza klientów',
                desc: 'Przechowuj dane klientów, historię wizyt, notatki i zdjęcia przed/po w jednym, bezpiecznym miejscu.',
              },
              {
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                ),
                title: 'Bezpieczeństwo i RODO',
                desc: 'Dane przechowywane na serwerach w UE. Szyfrowanie end-to-end, regularne backupy i pełna zgodność z przepisami.',
              },
              {
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                ),
                title: 'Statystyki i raporty',
                desc: 'Dashboard z kluczowymi wskaźnikami: liczba wizyt, stopień wypełnienia formularzy i przychody w jednym widoku.',
              },
            ].map((feature) => (
              <motion.div
                key={feature.title}
                variants={staggerItem}
                className="bg-card rounded-xl border border-border p-7 hover:shadow-[0_4px_16px_rgb(111_89_87/0.1)] transition-shadow duration-200"
              >
                <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center mb-5">
                  <svg aria-hidden="true" className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {feature.icon}
                  </svg>
                </div>
                <h3 className="font-serif text-lg text-foreground mb-2.5">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-28 px-6 bg-surface-container-low">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="text-center mb-16"
            variants={fadeUp}
            custom={0}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOpts}
          >
            <p className="text-xs font-semibold tracking-[0.14em] uppercase text-muted-foreground mb-5">Proces</p>
            <h2 className="font-serif text-3xl md:text-4xl font-normal text-foreground tracking-[-0.01em]">
              Jak to działa?
            </h2>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-3 gap-10 relative"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOpts}
          >
            {[
              {
                step: '01',
                title: 'Stwórz formularz',
                desc: 'Użyj kreatora, by zbudować formularz zgody dostosowany do Twojego zabiegu. Wybierz pola, dodaj logo gabinetu.',
              },
              {
                step: '02',
                title: 'Wyślij klientce',
                desc: 'Przypisz formularz do wizyty i wyślij unikalny link. Klientka wypełnia wygodnie na telefonie przed przyjazdem.',
              },
              {
                step: '03',
                title: 'Zarządzaj odpowiedziami',
                desc: 'Przeglądaj wypełnione formularze, śledź podpisy i archiwizuj dokumentację bez stosu papierów.',
              },
            ].map((step) => (
              <motion.div key={step.step} variants={staggerItem} className="text-center">
                <div className="w-12 h-12 rounded-full border-2 border-primary/30 text-primary flex items-center justify-center mx-auto mb-5 font-serif text-base">
                  {step.step}
                </div>
                <h3 className="font-serif text-lg text-foreground mb-2.5">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-28 px-6">
        <div className="max-w-md mx-auto">
          <motion.div
            className="text-center mb-14"
            variants={fadeUp}
            custom={0}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOpts}
          >
            <p className="text-xs font-semibold tracking-[0.14em] uppercase text-muted-foreground mb-5">Cennik</p>
            <h2 className="font-serif text-3xl md:text-4xl font-normal text-foreground tracking-[-0.01em]">
              Prosta, uczciwa cena
            </h2>
            <p className="text-muted-foreground mt-3 text-sm">
              Jeden plan, wszystkie funkcje. Bez ukrytych kosztów.
            </p>
          </motion.div>

          <motion.div
            className="bg-card rounded-xl border-2 border-primary/60 p-10 text-center shadow-[0_8px_30px_rgb(111_89_87/0.12)]"
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 0.9, 0.36, 1] }}
            viewport={viewportOpts}
          >
            <p className="text-xs font-semibold tracking-[0.14em] uppercase text-primary mb-6">Plan Pro</p>
            <div className="mb-7">
              <span className="font-serif text-6xl text-foreground">49</span>
              <span className="text-muted-foreground text-base"> zł / mies.</span>
            </div>
            <ul className="space-y-3 text-sm text-muted-foreground text-left mb-9">
              {[
                'Nieograniczone formularze',
                'Nieograniczona liczba klientów',
                'Zarządzanie wizytami i kalendarz',
                'Podpis cyfrowy RODO',
                'Wsparcie techniczne',
                '14 dni za darmo',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5">
                  <svg aria-hidden="true" className="w-4 h-4 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
            <Link
              to="/register"
              className="block bg-primary text-primary-foreground text-sm px-8 py-3.5 rounded-full font-medium hover:opacity-90 transition-opacity duration-150 text-center"
            >
              Wypróbuj przez 14 dni za darmo
            </Link>
            <p className="text-xs text-muted-foreground mt-4">Nie wymagamy karty kredytowej</p>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-28 px-6 bg-surface-container-low border-y border-border/60">
        <motion.div
          className="max-w-2xl mx-auto text-center"
          variants={fadeUp}
          custom={0}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOpts}
        >
          <h2 className="font-serif text-3xl md:text-4xl font-normal text-foreground tracking-[-0.01em] mb-5">
            Gotowa na cyfrowy gabinet?
          </h2>
          <p className="text-muted-foreground mb-9 leading-relaxed text-sm max-w-sm mx-auto">
            Dołącz do setek właścicielek gabinetów, które już oszczędzają czas i budują profesjonalny wizerunek dzięki docvue.
          </p>
          <Link
            to="/register"
            className="inline-block bg-primary text-primary-foreground text-sm px-10 py-4 rounded-full font-medium hover:opacity-90 transition-opacity duration-150"
          >
            Zacznij za darmo — 14 dni bez karty
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 border-t border-border/60">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <DocvueLogo className="text-base" />
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} docvue. Wszelkie prawa zastrzeżone.
          </p>
          <div className="flex items-center gap-6">
            <a href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150">Prywatność</a>
            <a href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150">Regulamin</a>
          </div>
        </div>
      </footer>
    </div>
  )

}
