import { createFileRoute, Outlet, redirect, Link } from '@tanstack/react-router'
import { LogOut, Menu } from 'lucide-react'
import { useState } from 'react'
import { ClientBottomNav, ClientDesktopNav, clientNavItems } from '@/components/client/mobile-nav'
import { DocvueLogo } from '@/components/ui/docvue-logo'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { getClientUserFn } from '@/src/server/auth'

export const Route = createFileRoute('/_client')({
  beforeLoad: async ({ context }) => {
    if (!context.user) throw redirect({ to: '/login' })
  },
  loader: async () => {
    return await getClientUserFn()
  },
  component: ClientLayout,
})

function ClientLayout() {
  const { client, user } = Route.useLoaderData()
  const [menuOpen, setMenuOpen] = useState(false)
  const displayName = client?.name || user?.email

  return (
    <div className="min-h-screen bg-background pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
      <header className="bg-card border-b border-border sticky top-0 z-40 safe-area-pt">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link to="/client/calendar" aria-label="docvue — panel klienta">
            <DocvueLogo className="text-xl" />
          </Link>

          <ClientDesktopNav />

          <div className="hidden md:flex items-center gap-4">
            <span className="text-sm font-medium text-foreground max-w-[220px] truncate">
              {displayName}
            </span>
            <Link
              to="/logout"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive transition-colors"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Wyloguj
            </Link>
          </div>

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Otwórz menu"
                className="md:hidden grid h-11 w-11 place-items-center rounded-md text-muted-foreground hover:bg-surface-container transition-colors"
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
                <p className="text-sm text-muted-foreground truncate">{displayName}</p>
              </SheetHeader>
              <nav aria-label="Menu klienta" className="flex flex-col gap-1 px-2 py-2">
                {clientNavItems.map(({ label, to, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 min-h-11 rounded-md px-3 text-sm font-medium text-foreground hover:bg-surface-container transition-colors"
                  >
                    <Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                    {label}
                  </Link>
                ))}
                <div className="mt-2 border-t border-border pt-2">
                  <Link
                    to="/logout"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 min-h-11 rounded-md px-3 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="h-5 w-5" aria-hidden="true" />
                    Wyloguj się
                  </Link>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <Outlet />
      </main>

      <ClientBottomNav />
    </div>
  )
}
