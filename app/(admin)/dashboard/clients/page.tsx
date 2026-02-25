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
  
  const { count } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })

  const isAddingNew = resolvedParams.new === 'true'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Klienci</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Zarządzaj klientami i przypisuj im formularze do wypełnienia
        </p>
      </div>

      {/* Stats */}
      <div className="bg-card rounded-xl p-5 border border-border/60 border-l-[3px] border-l-primary">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Wszystkich klientów</p>
        <p className="text-3xl font-bold text-foreground mt-1">{count || 0}</p>
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
    <div className="bg-card rounded-xl border border-border/60 overflow-hidden h-64 animate-pulse">
      <div className="bg-secondary h-10 w-full mb-4"></div>
      <div className="space-y-4 p-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-8 bg-secondary rounded w-full"></div>
        ))}
      </div>
    </div>
  )
}
