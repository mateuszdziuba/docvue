'use client'

import { Link, useRouterState } from '@tanstack/react-router'
import { useState } from 'react'
import { DocvueLogo } from '@/components/ui/docvue-logo'
import { useLock } from '@/components/providers/lock-provider'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import type { Salon } from '@/types/database'

// ── Icons ────────────────────────────────────────────────────────────────────

const IconDashboard = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
)
const IconClients = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="7" r="4" /><path d="M3 21v-2a6 6 0 0 1 6-6h2" />
    <circle cx="19" cy="11" r="3" /><path d="M17 21v-1a4 4 0 0 1 4-4" />
  </svg>
)
const IconCalendar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
)
const IconVisits = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
    <rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 12h6M9 16h4" />
  </svg>
)
const IconForms = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" /><line x1="9" y1="13" x2="15" y2="13" /><line x1="9" y1="17" x2="13" y2="17" />
  </svg>
)
const IconSubmissions = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
    <rect x="9" y="3" width="6" height="4" rx="1" /><path d="m9 12 2 2 4-4" />
  </svg>
)
const IconTreatments = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3l18 18M3 21l7-7" /><path d="m17.5 6.5-1 1" /><path d="M21 3l-5.5 5.5-3 3-1.5 4 4-1.5 3-3L21 3z" />
  </svg>
)
const IconStaff = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
)
const IconSettings = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)
const IconLock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)
const IconLogout = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
  </svg>
)
const IconMenu = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
  </svg>
)

// ── Nav items ─────────────────────────────────────────────────────────────────

const navigation = [
  { label: 'Przegląd',    href: '/dashboard',             icon: <IconDashboard />,   exact: true },
  { label: 'Klienci',     href: '/dashboard/clients',     icon: <IconClients /> },
  { label: 'Kalendarz',   href: '/dashboard/calendar',    icon: <IconCalendar /> },
  { label: 'Wizyty',      href: '/dashboard/visits',      icon: <IconVisits /> },
  { label: 'Formularze',  href: '/dashboard/forms',       icon: <IconForms /> },
  { label: 'Odpowiedzi',  href: '/dashboard/submissions', icon: <IconSubmissions /> },
  { label: 'Zabiegi',     href: '/dashboard/treatments',  icon: <IconTreatments /> },
]

const ownerNav = [
  { label: 'Pracownicy',  href: '/dashboard/staff',    icon: <IconStaff /> },
  { label: 'Ustawienia', href: '/dashboard/settings', icon: <IconSettings /> },
]

function NavLink({ item, onClick }: { item: { label: string; href: string; icon: React.ReactNode; exact?: boolean }; onClick?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isActive = item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(item.href + '/')

  return (
    <Link
      to={item.href}
      onClick={onClick}
      className={[
        'flex items-center gap-2.5 px-3 py-[7px] rounded-md text-[13.5px] leading-none transition-colors',
        isActive
          ? 'bg-primary-container text-on-primary-container font-medium'
          : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
      ].join(' ')}
    >
      <span className={isActive ? 'text-primary' : 'opacity-70'}>{item.icon}</span>
      {item.label}
    </Link>
  )
}

// ── Desktop Sidebar ───────────────────────────────────────────────────────────

export function Sidebar({ salon, isOwner = true }: { salon: Salon | null; isOwner?: boolean }) {
  const { lock } = useLock()

  return (
    <aside className="hidden md:flex flex-col h-full w-60 shrink-0 bg-surface-container-low border-r border-border">
      {/* Brand */}
      <div className="flex items-center h-14 px-5 border-b border-border shrink-0">
        <DocvueLogo className="text-[1.1rem]" />
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-[2px] px-2 py-3 overflow-y-auto">
        {navigation.map((item) => <NavLink key={item.href} item={item} />)}

        {isOwner && (
          <>
            <div className="my-2 mx-1 border-t border-border" />
            {ownerNav.map((item) => <NavLink key={item.href} item={item} />)}
          </>
        )}
      </nav>

      {/* Bottom */}
      <div className="shrink-0 px-2 py-3 border-t border-border space-y-[2px]">
        {salon && (
          <div className="px-3 py-2 mb-1">
            <p className="font-serif text-[13px] text-on-surface truncate leading-tight">{salon.name}</p>
            <p className="label-caps text-on-surface-variant/50 mt-0.5 text-[10px]">panel zarządzania</p>
          </div>
        )}

        <button
          onClick={lock}
          className="flex items-center gap-2.5 w-full px-3 py-[7px] rounded-md text-[13.5px] text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
        >
          <span className="opacity-70"><IconLock /></span>
          Tryb kiosku
        </button>

        <Link
          to="/logout"
          className="flex items-center gap-2.5 w-full px-3 py-[7px] rounded-md text-[13.5px] text-destructive/70 hover:bg-destructive/8 hover:text-destructive transition-colors"
        >
          <IconLogout />
          Wyloguj się
        </Link>
      </div>
    </aside>
  )
}

// ── Mobile Header ─────────────────────────────────────────────────────────────

export function MobileHeader({ salon: _salon, isOwner = true }: { salon: Salon | null; isOwner?: boolean }) {
  const [open, setOpen] = useState(false)
  const { lock } = useLock()
  const close = () => setOpen(false)

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-40 bg-surface-container-low border-b border-border md:hidden safe-area-pt">
        <div className="flex items-center justify-between h-14 px-4">
          <DocvueLogo className="text-[1.1rem]" />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                className="p-1.5 rounded-md text-on-surface-variant hover:bg-surface-container transition-colors"
                aria-label="Otwórz menu"
              >
                <IconMenu />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-60 p-0 pt-14 bg-surface-container-low" aria-label="Menu nawigacji">
              <nav className="flex-1 flex flex-col gap-[2px] px-2 py-3 overflow-y-auto">
                {navigation.map((item) => <NavLink key={item.href} item={item} onClick={close} />)}
                {isOwner && (
                  <>
                    <div className="my-2 mx-1 border-t border-border" />
                    {ownerNav.map((item) => <NavLink key={item.href} item={item} onClick={close} />)}
                  </>
                )}
              </nav>

              <div className="px-2 py-3 border-t border-border space-y-[2px]">
                <button
                  onClick={() => { lock(); close() }}
                  className="flex items-center gap-2.5 w-full px-3 py-[7px] rounded-md text-[13.5px] text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                >
                  <span className="opacity-70"><IconLock /></span>
                  Tryb kiosku
                </button>

                <Link
                  to="/logout"
                  className="flex items-center gap-2.5 w-full px-3 py-[7px] rounded-md text-[13.5px] text-destructive/70 hover:bg-destructive/8 hover:text-destructive transition-colors"
                  onClick={close}
                >
                  <IconLogout />
                  Wyloguj się
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>
    </>
  )
}
