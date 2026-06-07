import { createFileRoute, Outlet } from '@tanstack/react-router'
import { getSalonFn } from '../../server/settings'
import { Sidebar, MobileHeader } from '@/components/admin/sidebar'
import { MobileBottomNav } from '@/components/admin/mobile-nav'
import { LockProvider } from '@/components/providers/lock-provider'

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
      <div className="flex h-screen bg-background overflow-hidden">
        <Sidebar salon={salon} isOwner={isOwner} />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <MobileHeader salon={salon} isOwner={isOwner} />
          <main className="flex-1 overflow-y-auto pt-[calc(3.5rem+env(safe-area-inset-top))] md:pt-0 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
            <Outlet />
          </main>
          <MobileBottomNav />
        </div>
      </div>
    </LockProvider>
  )
}
