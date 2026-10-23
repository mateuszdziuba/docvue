'use client'

import { CalendarPlus, ClipboardList } from 'lucide-react'
import { useState } from 'react'
import { formatConsultationDate } from '@/lib/consultation'
import { Link } from '@/lib/link-compat'
import { useRouterCompat } from '@/lib/router-compat'
import type { ConsultationSummary } from '@/types/consultation'
import type { StaffMember, Treatment } from '@/types/database'
import { ScheduleTreatmentSheet } from './schedule-treatment-sheet'

const priceFormatter = new Intl.NumberFormat('pl-PL', {
  style: 'currency',
  currency: 'PLN',
})

type CatalogTreatment = Pick<Treatment, 'id' | 'name' | 'duration_minutes' | 'price'>

export function ConsultationRecommendationsCard({
  clientId,
  clientName,
  consultations,
  treatments,
  salonId,
  staffMembers,
}: {
  clientId: string
  clientName: string
  consultations: ConsultationSummary[]
  treatments: CatalogTreatment[]
  salonId: string
  staffMembers: Pick<StaffMember, 'id' | 'name'>[]
}) {
  const router = useRouterCompat()
  const [scheduledTreatment, setScheduledTreatment] = useState<CatalogTreatment | null>(null)
  const latest = consultations.find(
    (consultation) => consultation.recommended_treatment_ids.length > 0,
  )
  if (!latest) return null

  const recommended = latest.recommended_treatment_ids
    .map((id) => treatments.find((treatment) => treatment.id === id))
    .filter((treatment): treatment is CatalogTreatment => Boolean(treatment))

  if (recommended.length === 0) return null

  return (
    <section className="rounded-2xl border border-primary/20 bg-primary-container/25 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-background/70 text-primary">
              <ClipboardList className="h-4 w-4" aria-hidden="true" />
            </span>
            <h2 className="text-lg font-semibold text-on-primary-container">Zalecane zabiegi</h2>
          </div>
          <p className="mt-2 text-sm text-on-primary-container/80">
            Z konsultacji z {formatConsultationDate(latest.consultation_date)}. Wybierz zabieg i
            przejdź do planowania wizyty.
          </p>
        </div>
        <Link
          href={`/dashboard/clients/${clientId}/consultations/${latest.id}`}
          className="text-xs font-medium text-on-primary-container underline-offset-4 hover:underline"
        >
          Otwórz konsultację →
        </Link>
      </div>

      <ul className="mt-4 space-y-2">
        {recommended.map((treatment) => (
          <li
            key={treatment.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/15 bg-background/70 px-3.5 py-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{treatment.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {treatment.duration_minutes} min
                {treatment.price != null ? ` · ${priceFormatter.format(treatment.price)}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setScheduledTreatment(treatment)}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-primary/30 bg-background px-3.5 text-xs font-medium text-foreground transition-colors hover:bg-primary-container/50"
            >
              <CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" />
              Zaplanuj wizytę
            </button>
          </li>
        ))}
      </ul>

      <ScheduleTreatmentSheet
        open={scheduledTreatment !== null}
        onOpenChange={(open) => {
          if (!open) setScheduledTreatment(null)
        }}
        clientId={clientId}
        clientName={clientName}
        treatment={scheduledTreatment}
        salonId={salonId}
        staffMembers={staffMembers}
        onCreated={() => {
          setScheduledTreatment(null)
          void router.invalidate()
        }}
      />
    </section>
  )
}
