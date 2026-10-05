'use client'

import { Link } from '@tanstack/react-router'
import { format, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'
import { Eye, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { SearchInput } from '@/components/ui/search-input'
import { SubmissionPreviewDialog } from './submission-preview-dialog'

interface SubmissionsListProps {
  submissions: any[]
  query: string
}

export function SubmissionsList({ submissions }: SubmissionsListProps) {
  return (
    <div className="space-y-4">
      <SearchInput placeholder="Szukaj odpowiedzi…" />

      {submissions.length === 0 ? (
        <div className="rounded-lg border border-border bg-card">
          <EmptyState
            icon={<FileText className="h-6 w-6" aria-hidden="true" />}
            title="Brak odpowiedzi"
          />
        </div>
      ) : (
        <div className="bg-card rounded-lg border border-border divide-y divide-border overflow-hidden">
          {submissions.map((sub) => (
            <div
              key={sub.id}
              className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-surface-container-low"
            >
              <Link
                to="/dashboard/submissions/$submissionId"
                params={{ submissionId: sub.id }}
                className="min-w-0 flex-1"
              >
                <p className="font-medium text-foreground truncate">
                  {sub.client_name ?? 'Anonim'}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {sub.forms?.title ?? 'Formularz'} ·{' '}
                  {format(parseISO(sub.created_at), 'd MMM yyyy, HH:mm', { locale: pl })}
                </p>
              </Link>
              <SubmissionPreviewDialog
                submission={sub}
                trigger={
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    aria-label={`Podgląd odpowiedzi: ${sub.client_name ?? 'Anonim'}`}
                  >
                    <Eye className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    Podgląd
                  </Button>
                }
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
