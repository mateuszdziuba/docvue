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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Formularze</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Zarządzaj formularzami dla swoich klientów
          </p>
        </div>
        <Link
          href="/dashboard/forms/new"
          className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-medium rounded-xl hover:from-pink-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl shrink-0"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    <div className="grid gap-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 h-32 animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
        </div>
      ))}
    </div>
  )
}
