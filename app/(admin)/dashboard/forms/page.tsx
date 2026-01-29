import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { FormsList } from '@/components/admin/forms-list'

export default async function FormsPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: salon } = await supabase
    .from('salons')
    .select('id')
    .eq('user_id', user?.id)
    .single()

  const { data: forms } = await supabase
    .from('forms')
    .select('*')
    .eq('salon_id', salon?.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Formularze</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Zarządzaj formularzami dla swoich klientów
          </p>
        </div>
        <Link
          href="/dashboard/forms/new"
          className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-medium rounded-xl hover:from-pink-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nowy formularz
        </Link>
      </div>

      {/* Forms List */}
      <FormsList forms={forms || []} />
    </div>
  )
}
