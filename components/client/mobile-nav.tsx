'use client'

import { Link, useRouterState } from '@tanstack/react-router'
import { CalendarDays, MessageCircle, User, type LucideIcon } from 'lucide-react'

export const clientNavItems: Array<{
  label: string
  to: string
  icon: LucideIcon
}> = [
  { label: 'Wizyty', to: '/client/calendar', icon: CalendarDays },
  { label: 'Czat', to: '/client/chat', icon: MessageCircle },
  { label: 'Profil', to: '/client/profile', icon: User },
]

function useIsActive() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  return (to: string) => pathname === to || pathname.startsWith(`${to}/`)
}

export function ClientBottomNav() {
  const isActive = useIsActive()

  return (
    <nav
      aria-label="Nawigacja dolna"
      className="fixed bottom-0 inset-x-0 z-50 bg-card border-t border-border md:hidden safe-area-pb safe-area-pl safe-area-pr"
    >
      <div className="flex items-center justify-around h-14">
        {clientNavItems.map(({ label, to, icon: Icon }) => {
          const active = isActive(to)
          return (
            <Link
              key={to}
              to={to}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export function ClientDesktopNav() {
  const isActive = useIsActive()

  return (
    <nav aria-label="Nawigacja główna" className="hidden md:flex items-center gap-5">
      {clientNavItems.map(({ label, to }) => (
        <Link
          key={to}
          to={to}
          aria-current={isActive(to) ? 'page' : undefined}
          className={`text-sm transition-colors ${
            isActive(to)
              ? 'text-foreground font-medium'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  )
}
