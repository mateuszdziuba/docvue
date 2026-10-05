import { createFileRoute, Outlet } from '@tanstack/react-router'
import { MobileBottomNav } from '@/components/admin/mobile-nav'
import { MobileHeader, Sidebar } from '@/components/admin/sidebar'
import { LockProvider } from '@/components/providers/lock-provider'
import { OfflineBanner } from '@/src/components/pwa/offline-banner'
import { getSalonFn } from '../../server/settings'

export const Route = createFileRoute('/_authed/dashboard')({
  loader: async () => {
    const salon = await getSalonFn()
    return { salon }
  },
  component: DashboardLayout,
})

function DashboardLayout() {
  const { salon } = Route.useLoaderData()
  const { isOwner } = Route.useRouteContext()

  return (
    <LockProvider>
      <OfflineBanner />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-modal focus:ring-2 focus:ring-ring"
      >
        Przejdź do treści
      </a>
      <div className="flex h-dvh bg-background overflow-hidden">
        <Sidebar salon={salon} isOwner={isOwner} />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <MobileHeader salon={salon} isOwner={isOwner} />
          <main
            id="main-content"
            tabIndex={-1}
            className="flex-1 overflow-y-auto pt-[calc(3.5rem+env(safe-area-inset-top))] md:pt-0 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0"
          >
            <Outlet />
          </main>
          <MobileBottomNav />
        </div>
      </div>
    </LockProvider>
  )
}
