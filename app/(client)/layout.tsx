import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { DocvueLogo } from '@/components/ui/docvue-logo'

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: client } = await supabase
    .from('clients')
    .select('id, name')
    .eq('user_id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <nav className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/calendar">
            <DocvueLogo className="text-xl" />
          </Link>
          <div className="flex items-center gap-4">
             <div className="text-sm font-medium text-foreground">
               {client?.name || user.email}
             </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border md:hidden pb-safe">
        <div className="grid grid-cols-2 h-14">
          <Link href="/calendar" className="flex flex-col items-center justify-center text-xs font-medium text-muted-foreground hover:text-primary">
            <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Kalendarz
          </Link>
          <Link href="/profile" className="flex flex-col items-center justify-center text-xs font-medium text-muted-foreground hover:text-primary">
             <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Profil
          </Link>
        </div>
      </div>
    </div>
  )
}
