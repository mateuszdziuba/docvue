import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { TreatmentsList } from '@/components/admin/treatments-list'
import { Skeleton } from '@/components/ui/skeleton'

export default async function TreatmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string }>
}) {
  const resolvedParams = await searchParams
  const query = resolvedParams.query || ''

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Zabiegi</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Zarządzaj ofertą zabiegów i wymaganiami dotyczącymi formularzy
        </p>
      </div>

      <Suspense fallback={<TreatmentsListSkeleton />}>
        <FilteredTreatmentsList query={query} />
      </Suspense>
    </div>
  )
}

function TreatmentsListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-24 w-full rounded-xl" />
      ))}
    </div>
  )
}

async function FilteredTreatmentsList({ query }: { query: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: salon } = await supabase.from('salons').select('id').eq('user_id', user?.id).single()

  let request = supabase
    .from('treatments')
    .select(`
      *,
      treatment_forms (
        forms (id, title)
      )
    `)
    .eq('salon_id', salon?.id)
    .order('name')

  if (query) {
    request = request.ilike('name', `%${query}%`)
  }

  const { data: treatments } = await request

  // Fetch available forms for the dropdown in add/edit dialog
  const { data: forms } = await supabase
    .from('forms')
    .select('id, title')
    .eq('salon_id', salon?.id)
    .eq('is_active', true)
    .order('title')

  return <TreatmentsList treatments={treatments || []} forms={forms || []} />
}
