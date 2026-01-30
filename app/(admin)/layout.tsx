import { Sidebar, MobileHeader } from '@/components/admin/sidebar'
import { MobileBottomNav } from '@/components/admin/mobile-nav'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LockProvider } from '@/components/providers/lock-provider'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <LockProvider>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        {/* Desktop Sidebar */}
        <Sidebar />
        
        {/* Mobile Header */}
        <MobileHeader />
        
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {/* Add padding for mobile header and bottom nav */}
          <div className="p-4 md:p-8 pt-[4.5rem] md:pt-8 pb-20 md:pb-8">
            {children}
          </div>
        </main>
        
        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />
      </div>
    </LockProvider>
  )
}
