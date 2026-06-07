import { createFileRoute, Outlet, redirect, Link } from '@tanstack/react-router'
import { getClientUserFn } from '@/src/server/auth'
import { DocvueLogo } from '@/components/ui/docvue-logo'

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

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <nav className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/client/calendar">
            <DocvueLogo className="text-xl" />
          </Link>
          <div className="flex items-center gap-5">
            <Link to="/client/calendar" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Wizyty
            </Link>
            <Link to="/client/book" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Rezerwacja
            </Link>
            <Link to="/client/chat" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Czat
            </Link>
            <Link to="/client/profile" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Profil
            </Link>
            <div className="text-sm font-medium text-foreground ml-2">
              {client?.name || user?.email}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
