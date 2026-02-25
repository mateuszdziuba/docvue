import Link from 'next/link'
import { Suspense } from 'react'
import { FilteredFormsList } from '@/components/admin/filtered-forms-list'
import { SearchInput } from '@/components/ui/search-input'
import { Skeleton } from '@/components/ui/skeleton'

export default async function FormsPage({
  searchParams,
}: {
  searchParams: Promise<{
    query?: string
  }>
}) {
  const resolvedParams = await searchParams
  const query = resolvedParams.query || ''

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Formularze</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Zarządzaj formularzami dla swoich klientów
          </p>
        </div>
        <Link
          href="/dashboard/forms/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nowy formularz
        </Link>
      </div>

      {/* Search */}
      <div className="w-full">
        <SearchInput placeholder="Szukaj formularzy..." />
      </div>

      {/* Forms List */}
      <Suspense fallback={<FormsListSkeleton />}>
        <FilteredFormsList query={query} />
      </Suspense>
    </div>
  )
}

function FormsListSkeleton() {
  return (
    <div className="grid gap-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-card rounded-xl p-5 border border-border/60 h-28 animate-pulse">
          <div className="h-4 bg-secondary rounded w-1/3 mb-4"></div>
          <div className="h-3 bg-secondary rounded w-1/2 mb-2"></div>
          <div className="h-3 bg-secondary rounded w-1/4"></div>
        </div>
      ))}
    </div>
  )
}
