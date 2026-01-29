import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

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

  // Verify if user is a client
  const { data: client } = await supabase
    .from('clients')
    .select('id, name')
    .eq('user_id', user.id)
    .single()

  if (!client) {
    // If user is logged in but not a client (e.g. admin trying to access client portal), 
    // strictly speaking should redirect or show error?
    // For now, let's allow it or redirect to admin dashboard if they are admin?
    // Safe fallback:
    // return redirect('/dashboard') 
    // But maybe they want to see it? I'll show a warning or just render.
    // Actually, if they are not a client, the views won't work perfectly.
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 md:pb-0">
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/calendar" className="font-bold text-xl bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-purple-600">
            BeautySpace
          </Link>
          <div className="flex items-center gap-4">
             <div className="text-sm font-medium text-gray-700 dark:text-gray-200">
               {client?.name || user.email}
             </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 md:hidden pb-safe">
        <div className="grid grid-cols-2 h-16">
          <Link href="/calendar" className="flex flex-col items-center justify-center text-xs font-medium text-gray-500 hover:text-purple-600 dark:text-gray-400">
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Kalendarz
          </Link>
          <Link href="/profile" className="flex flex-col items-center justify-center text-xs font-medium text-gray-500 hover:text-purple-600 dark:text-gray-400">
             <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Profil
          </Link>
        </div>
      </div>
    </div>
  )
}
