import { createClient } from '@/lib/supabase/server'
import { ClientsList } from '@/components/admin/clients-list'

export default async function ClientsPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: salon } = await supabase
    .from('salons')
    .select('id')
    .eq('user_id', user?.id)
    .single()

  // Get clients from the clients table
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .eq('salon_id', salon?.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Klienci</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Zarządzaj klientami i przypisuj im formularze do wypełnienia
        </p>
      </div>

      {/* Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
        <p className="text-sm text-gray-500 dark:text-gray-400">Wszystkich klientów</p>
        <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{clients?.length || 0}</p>
      </div>

      {/* Clients List with Add Form */}
      <ClientsList clients={clients || []} />
    </div>
  )
}
