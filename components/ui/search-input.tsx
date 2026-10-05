'use client'

import { useLocation, useNavigate, useSearch } from '@tanstack/react-router'
import { useId, useTransition } from 'react'
import { useDebouncedCallback } from 'use-debounce'

export function SearchInput({ placeholder }: { placeholder: string }) {
  const navigate = useNavigate()
  const location = useLocation()
  const search = useSearch({ strict: false }) as Record<string, string>
  const [isPending, startTransition] = useTransition()
  const inputId = useId()
  const handleSearch = useDebouncedCallback((term: string) => {
    if (term === search.query) return
    startTransition(() => {
      navigate({
        to: location.pathname,
        search: ((prev: Record<string, unknown>) => ({
          ...prev,
          query: term || undefined,
        })) as never,
      })
    })
  }, 300)

  return (
    <div className="relative flex-1 max-w-md">
      <label htmlFor={inputId} className="sr-only">
        {placeholder}
      </label>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg
          className={`h-5 w-5 ${isPending ? 'text-primary animate-pulse' : 'text-muted-foreground'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <input
        id={inputId}
        type="search"
        defaultValue={search.query}
        onChange={(e) => handleSearch(e.target.value)}
        className="block w-full pl-10 pr-3 py-2 border border-border rounded-xl leading-5 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 sm:text-sm transition-all"
        placeholder={placeholder}
      />
      {isPending && (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center" role="status">
          <svg
            className="animate-spin h-4 w-4 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="sr-only">Ładowanie wyników</span>
        </div>
      )}
    </div>
  )
}
