'use client'

import { ArrowRight, Clock3, FileText, Loader2, Plus, ScanFace } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { formatConsultationDate, formatDateTime } from '@/lib/consultation'
import { Link } from '@/lib/link-compat'
import { useRouterCompat } from '@/lib/router-compat'
import { cn } from '@/lib/utils'
import { createConsultationFn } from '@/src/server/consultations'
import type { ConsultationSummary } from '@/types/consultation'

function StatusBadge({ status }: { status: ConsultationSummary['status'] }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]',
        status === 'completed'
          ? 'bg-success-container text-on-success-container'
          : 'bg-warning-container text-on-warning-container',
      )}
    >
      {status === 'completed' ? 'Zakończona' : 'Wersja robocza'}
    </span>
  )
}

export function ConsultationHistoryCard({
  clientId,
  consultations,
  limit,
  className,
  error,
}: {
  clientId: string
  consultations: ConsultationSummary[]
  limit?: number
  className?: string
  error?: string | null
}) {
  const router = useRouterCompat()
  const [isCreating, setIsCreating] = useState(false)
  const visible = typeof limit === 'number' ? consultations.slice(0, limit) : consultations

  const startConsultation = async () => {
    setIsCreating(true)
    try {
      const result = await createConsultationFn({ data: { clientId } })
      if (result.error || !result.consultation) {
        toast.error(result.error ?? 'Nie udało się utworzyć konsultacji')
        return
      }
      await router.invalidate()
      router.push(`/dashboard/clients/${clientId}/consultations/${result.consultation.id}`)
    } catch {
      toast.error('Nie udało się utworzyć konsultacji')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <section className={cn('rounded-2xl border border-border/60 bg-card p-5 sm:p-6', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
              <ScanFace className="h-4 w-4" aria-hidden="true" />
            </span>
            <h2 className="text-lg font-semibold text-foreground">Konsultacje</h2>
          </div>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Holistyczna karta klienta, mapa twarzy i plan terapii — dokument wewnętrzny gabinetu.
          </p>
        </div>
        <Button type="button" onClick={() => void startConsultation()} disabled={isCreating}>
          {isCreating ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
          )}
          Nowa konsultacja
        </Button>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-warning/25 bg-warning-container/60 px-3.5 py-2.5 text-xs leading-relaxed text-on-warning-container">
          Nie udało się wczytać konsultacji: {error}. Jeśli to nowe wdrożenie, uruchom migrację bazy
          danych.
        </div>
      ) : null}

      {visible.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-border/70 bg-surface-container-low/40 px-4 py-6 text-center">
          <FileText className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden="true" />
          <p className="mt-2 text-sm font-medium text-foreground">Brak zapisanych konsultacji</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Rozpocznij pierwszą konsultację, aby zebrać wywiad, dodać mapę twarzy i zaplanować
            terapię.
          </p>
        </div>
      ) : (
        <ul className="mt-5 space-y-2">
          {visible.map((consultation) => (
            <li key={consultation.id}>
              <Link
                href={`/dashboard/clients/${clientId}/consultations/${consultation.id}`}
                className="group flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/50 px-3.5 py-3 transition-colors hover:bg-surface-container-low"
              >
                <span className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-container-low text-muted-foreground">
                    <FileText className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {formatConsultationDate(consultation.consultation_date)}
                      </span>
                      <StatusBadge status={consultation.status} />
                      {consultation.face_annotation_count > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary-container/60 px-2 py-0.5 text-[10px] font-medium text-on-primary-container">
                          <ScanFace className="h-2.5 w-2.5" aria-hidden="true" />
                          {consultation.face_annotation_count}
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-1 block truncate text-xs text-muted-foreground">
                      {consultation.cosmetic_goal || 'Brak zdefiniowanego celu kosmetologicznego'}
                    </span>
                    <span className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock3 className="h-3 w-3" aria-hidden="true" />
                      {consultation.created_by_name ?? 'Personel gabinetu'} ·{' '}
                      {formatDateTime(consultation.updated_at)}
                    </span>
                  </span>
                </span>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {typeof limit === 'number' && consultations.length > limit ? (
        <div className="mt-3 text-right">
          <Link
            href={`/dashboard/clients/${clientId}/consultations`}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Zobacz wszystkie ({consultations.length})
          </Link>
        </div>
      ) : null}
    </section>
  )
}
