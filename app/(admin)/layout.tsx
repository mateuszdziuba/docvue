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

  const { data: salon } = await supabase
    .from('salons')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return (
    <LockProvider>
      <div className="flex h-screen bg-background">
        {/* Desktop Sidebar */}
        <Sidebar salon={salon} />

        {/* Mobile Header */}
        <MobileHeader salon={salon} />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
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
