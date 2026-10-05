'use client'

import { Briefcase, FileText } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Combobox } from '@/components/ui/combobox'
import { EmptyState } from '@/components/ui/empty-state'
import { SearchInput } from '@/components/ui/search-input'
import { useRouterCompat } from '@/lib/router-compat'
import { deleteTreatmentFn } from '@/src/server/treatments'
import type { Form, Treatment } from '@/types/database'
import { AddTreatmentDialog } from './add-treatment-dialog'
import { DeleteIconButton } from './delete-icon-button'
import { EditTreatmentDialog } from './edit-treatment-dialog'

interface TreatmentsListProps {
  treatments: (Treatment & { treatment_forms: { forms: { id: string; title: string } | null }[] })[]
  forms: Pick<Form, 'id' | 'title'>[]
  query?: string
  isOwner?: boolean
}

const currency = new Intl.NumberFormat('pl-PL', {
  style: 'currency',
  currency: 'PLN',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

function formatPrice(treatment: Treatment): string | null {
  if (treatment.price === null || treatment.price === undefined) return null
  if (treatment.price_max && treatment.price_max > treatment.price) {
    return `${currency.format(treatment.price)} – ${currency.format(treatment.price_max)}`
  }
  return currency.format(treatment.price)
}

export function TreatmentsList({
  treatments,
  forms,
  query = '',
  isOwner = false,
}: TreatmentsListProps) {
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [category, setCategory] = useState<string>('all')
  const router = useRouterCompat()

  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const t of treatments) set.add(t.category?.trim() || 'Bez kategorii')
    return [...set].sort((a, b) => a.localeCompare(b, 'pl'))
  }, [treatments])

  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of treatments) {
      const key = t.category?.trim() || 'Bez kategorii'
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return map
  }, [treatments])

  const categoryOptions = useMemo(
    () => [
      { value: 'all', label: 'Wszystkie kategorie', hint: String(treatments.length) },
      ...categories.map((c) => ({
        value: c,
        label: c,
        hint: String(categoryCounts.get(c) ?? 0),
      })),
    ],
    [categories, categoryCounts, treatments.length],
  )

  const groups = useMemo(() => {
    const map = new Map<string, typeof treatments>()
    for (const t of treatments) {
      const key = t.category?.trim() || 'Bez kategorii'
      if (category !== 'all' && key !== category) continue
      const list = map.get(key) ?? []
      list.push(t)
      map.set(key, list)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, 'pl'))
  }, [treatments, category])

  const handleDelete = async (id: string) => {
    try {
      setIsDeleting(id)
      const result = await deleteTreatmentFn({ data: { id } })
      if ('error' in result && result.error) throw new Error(result.error)
      toast.success('Zabieg został usunięty')
      router.refresh()
    } catch (error) {
      toast.error('Nie udało się usunąć zabiegu')
      console.error(error)
    } finally {
      setIsDeleting(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <SearchInput placeholder="Szukaj zabiegów…" />
        {categories.length > 1 && (
          <div className="flex items-center gap-2">
            <span
              id="treatment-category-label"
              className="text-sm text-muted-foreground whitespace-nowrap"
            >
              Kategoria
            </span>
            <Combobox
              options={categoryOptions}
              value={category}
              onChange={setCategory}
              aria-labelledby="treatment-category-label"
              placeholder="Wybierz kategorię"
              searchPlaceholder="Szukaj kategorii…"
              emptyText="Brak kategorii."
              className="h-10 w-full bg-card sm:w-72"
            />
          </div>
        )}
        <div className="sm:ml-auto">{isOwner && <AddTreatmentDialog forms={forms} />}</div>
      </div>

      {groups.map(([groupName, items]) => (
        <section key={groupName} aria-label={groupName} className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-serif text-lg text-foreground">{groupName}</h2>
            <span className="text-xs text-muted-foreground">{items.length}</span>
          </div>
          <div className="grid gap-3">
            {items.map((treatment) => {
              const price = formatPrice(treatment)
              return (
                <div
                  key={treatment.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-card rounded-xl border border-border/60"
                >
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-foreground">{treatment.name}</h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        {treatment.duration_minutes} min
                      </span>
                      {price && <span className="font-medium text-foreground">{price}</span>}
                      {treatment.online_booking && (
                        <Badge className="border-transparent rounded-full bg-info-container px-2.5 py-0.5 text-xs font-medium text-on-info-container">
                          Rezerwacja online
                        </Badge>
                      )}
                    </div>
                    {treatment.treatment_forms && treatment.treatment_forms.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {treatment.treatment_forms.map(
                          (tf) =>
                            tf.forms && (
                              <Badge
                                key={tf.forms.id}
                                className="gap-1.5 rounded-md border-transparent bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                              >
                                <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                                {tf.forms.title}
                              </Badge>
                            ),
                        )}
                      </div>
                    )}
                  </div>

                  {isOwner && (
                    <div className="flex items-center gap-2 shrink-0">
                      <EditTreatmentDialog treatment={treatment} forms={forms} />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DeleteIconButton
                            label={`Usuń zabieg ${treatment.name}`}
                            disabled={isDeleting === treatment.id}
                            className="h-11 w-11"
                            iconClassName="h-5 w-5"
                          >
                            {isDeleting === treatment.id ? (
                              <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            ) : undefined}
                          </DeleteIconButton>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Usuń zabieg</AlertDialogTitle>
                            <AlertDialogDescription>
                              Czy na pewno chcesz usunąć zabieg „{treatment.name}”? Tej operacji nie
                              można cofnąć.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Anuluj</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(treatment.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Usuń zabieg
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      ))}

      {treatments.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-secondary/30">
          <EmptyState
            icon={<Briefcase className="h-6 w-6" aria-hidden="true" />}
            title={query ? 'Brak wyników wyszukiwania' : 'Brak zabiegów'}
            description={
              query
                ? `Nie znaleziono zabiegów pasujących do zapytania „${query}”.`
                : 'Dodaj pierwszy zabieg do swojej oferty, aby móc umawiać wizyty.'
            }
          />
        </div>
      )}

      {treatments.length > 0 && groups.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-secondary/30">
          <EmptyState
            title="Brak zabiegów w tej kategorii"
            description="Zmień filtr kategorii, aby zobaczyć pozostałe zabiegi."
          />
        </div>
      )}
    </div>
  )
}
