'use client'

import { useSearchParams, usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState, useTransition } from 'react'

export function SearchInput({ placeholder }: { placeholder: string }) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { replace } = useRouter()
  const [isPending, startTransition] = useTransition()
  const [value, setValue] = useState(searchParams.get('query')?.toString() || '')

  // Update local state when URL changes (e.g. back button)
  useEffect(() => {
    setValue(searchParams.get('query')?.toString() || '')
  }, [searchParams])

  const handleSearch = useCallback((term: string) => {
    const params = new URLSearchParams(searchParams)
    if (term) {
      params.set('query', term)
    } else {
      params.delete('query')
    }
    
    startTransition(() => {
      replace(`${pathname}?${params.toString()}`)
    })
  }, [searchParams, pathname, replace])

  // Debounce effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch(value)
    }, 300)
    
    return () => clearTimeout(timeoutId)
  }, [value, handleSearch])

  return (
    <div className="relative flex-1 max-w-md">
      <label htmlFor="search" className="sr-only">
        Szukaj
      </label>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg 
          className={`h-5 w-5 ${isPending ? 'text-purple-500 animate-pulse' : 'text-gray-400'}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="block w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent sm:text-sm transition-all"
        placeholder={placeholder}
      />
      {isPending && (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
          <svg className="animate-spin h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      )}
    </div>
  )
}
