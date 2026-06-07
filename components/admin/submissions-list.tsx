'use client'

import { Link } from '@tanstack/react-router'
import { format, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'
import { useState } from 'react'

interface SubmissionsListProps {
  submissions: any[]
  query: string
}

export function SubmissionsList({ submissions, query }: SubmissionsListProps) {
  const [search, setSearch] = useState(query)

  const filtered = submissions.filter((s) => {
    if (!search) return true
    return (
      s.client_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.forms?.title?.toLowerCase().includes(search.toLowerCase())
    )
  })

  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="Szukaj odpowiedzi…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
      />

      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-lg border border-border">
          <p className="text-muted-foreground">Brak odpowiedzi</p>
        </div>
      ) : (
        <div className="bg-card rounded-lg border border-border divide-y divide-border overflow-hidden">
          {filtered.map((sub) => (
            <Link
              key={sub.id}
              to="/dashboard/submissions/$submissionId"
              params={{ submissionId: sub.id }}
              className="flex items-center justify-between p-4 hover:bg-surface-container-low transition-colors"
            >
              <div>
                <p className="font-medium text-foreground">{sub.client_name ?? 'Anonim'}</p>
                <p className="text-sm text-muted-foreground">
                  {sub.forms?.title ?? 'Formularz'} ·{' '}
                  {format(parseISO(sub.created_at), 'd MMM yyyy, HH:mm', { locale: pl })}
                </p>
              </div>
              <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
