'use client'

import { CalendarPlus, Check, Plus, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Link } from '@/lib/link-compat'
import { cn } from '@/lib/utils'
import type { Treatment } from '@/types/database'

type CatalogTreatment = Pick<Treatment, 'id' | 'name' | 'duration_minutes' | 'price'>

const priceFormatter = new Intl.NumberFormat('pl-PL', {
  style: 'currency',
  currency: 'PLN',
})

export function TreatmentPicker({
  treatments,
  selectedIds,
  onChange,
  onSchedule,
  disabled,
}: {
  treatments: CatalogTreatment[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  onSchedule?: (treatment: CatalogTreatment) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [draftIds, setDraftIds] = useState<string[]>(selectedIds)

  useEffect(() => {
    if (!open) return
    setDraftIds(selectedIds)
    setQuery('')
  }, [open, selectedIds])

  const selectedTreatments = selectedIds
    .map((id) => treatments.find((treatment) => treatment.id === id))
    .filter((treatment): treatment is CatalogTreatment => Boolean(treatment))
  const missingCount = selectedIds.length - selectedTreatments.length

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return treatments
    return treatments.filter((treatment) => treatment.name.toLowerCase().includes(term))
  }, [query, treatments])

  const toggleDraft = (id: string) => {
    setDraftIds((previous) =>
      previous.includes(id) ? previous.filter((value) => value !== id) : [...previous, id],
    )
  }

  const remove = (id: string) => {
    if (disabled) return
    onChange(selectedIds.filter((value) => value !== id))
  }

  return (
    <div className="space-y-2.5">
      {selectedTreatments.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selectedTreatments.map((treatment) => (
            <span
              key={treatment.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary-container/50 py-1 pl-3 pr-1 text-[11px] font-medium text-on-primary-container"
            >
              {treatment.name}
              {onSchedule ? (
                <button
                  type="button"
                  onClick={() => onSchedule(treatment)}
                  disabled={disabled}
                  aria-label={`Zaplanuj wizytę: ${treatment.name}`}
                  className="grid h-6 w-6 place-items-center rounded-full hover:bg-background/70 disabled:opacity-50"
                >
                  <CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => remove(treatment.id)}
                disabled={disabled}
                aria-label={`Usuń zabieg: ${treatment.name}`}
                className="grid h-6 w-6 place-items-center rounded-full hover:bg-background/70 disabled:opacity-50"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Nie przypisano jeszcze zabiegów.</p>
      )}

      {missingCount > 0 ? (
        <p className="text-[11px] text-on-warning-container">
          {missingCount}{' '}
          {missingCount === 1 ? 'zabieg został usunięty' : 'zabiegi zostały usunięte'} z katalogu.
        </p>
      ) : null}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="min-h-10 rounded-full border-primary/25 bg-background text-xs"
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
        {selectedTreatments.length > 0 ? 'Zmień zabiegi' : 'Dodaj zabieg z katalogu'}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-normal">
              Zabiegi z katalogu
            </DialogTitle>
            <DialogDescription>
              Wybierz zabiegi przypisane do tego etapu. Będzie je można od razu zaplanować jako
              wizyty.
            </DialogDescription>
          </DialogHeader>

          {treatments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 bg-surface-container-low/50 p-4 text-sm text-muted-foreground">
              Katalog zabiegów jest pusty.{' '}
              <Link
                href="/dashboard/treatments"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Dodaj zabiegi w katalogu
              </Link>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Szukaj zabiegu…"
                  aria-label="Szukaj zabiegu"
                  className="min-h-11 rounded-xl border-border bg-background pl-9 text-base"
                />
              </div>

              <ul className="max-h-80 space-y-1 overflow-y-auto pr-1">
                {filtered.length === 0 ? (
                  <li className="px-2 py-4 text-sm text-muted-foreground">Brak wyników.</li>
                ) : (
                  filtered.map((treatment) => {
                    const checked = draftIds.includes(treatment.id)
                    return (
                      <li key={treatment.id}>
                        <label
                          className={cn(
                            'flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 transition-colors',
                            checked ? 'bg-primary-container/50' : 'hover:bg-surface-container-low',
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleDraft(treatment.id)}
                            className="h-4 w-4 shrink-0 accent-primary"
                          />
                          <span className="flex min-w-0 flex-1 items-baseline justify-between gap-3">
                            <span className="truncate text-sm font-medium text-foreground">
                              {treatment.name}
                            </span>
                            <span className="shrink-0 text-[11px] text-muted-foreground">
                              {treatment.duration_minutes} min
                              {treatment.price != null
                                ? ` · ${priceFormatter.format(treatment.price)}`
                                : ''}
                            </span>
                          </span>
                          {checked ? (
                            <Check
                              className="h-3.5 w-3.5 shrink-0 text-primary"
                              aria-hidden="true"
                            />
                          ) : null}
                        </label>
                      </li>
                    )
                  })
                )}
              </ul>
            </>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Anuluj
            </Button>
            <Button
              type="button"
              onClick={() => {
                onChange(draftIds)
                setOpen(false)
              }}
              disabled={treatments.length === 0}
            >
              Gotowe{draftIds.length > 0 ? ` (${draftIds.length})` : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
