import { Suspense } from 'react'
import { FilteredClientsList } from '@/components/admin/filtered-clients-list'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase/server'

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{
    query?: string
    new?: string
  }>
}) {
  const resolvedParams = await searchParams
  const query = resolvedParams.query || ''
  const supabase = await createClient()
  
  // Helper to fetch total count quickly
  // In a real app with search, count might need to match search or not, 
  // currently treating generic stats as total clients
  const { count } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })

  const isAddingNew = resolvedParams.new === 'true'

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
        <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{count || 0}</p>
      </div>



      {/* Clients List with Add Form */}
      <Suspense fallback={<ClientsListSkeleton />}>
        <FilteredClientsList query={query} isAddingNew={isAddingNew} />
      </Suspense>
    </div>
  )
}

function ClientsListSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden h-64 animate-pulse">
      <div className="bg-gray-50 dark:bg-gray-700/50 h-10 w-full mb-4"></div>
      <div className="space-y-4 p-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-8 bg-gray-100 dark:bg-gray-700 rounded w-full"></div>
        ))}
      </div>
    </div>
  )
}
