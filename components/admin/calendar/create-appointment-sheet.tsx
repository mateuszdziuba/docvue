'use client'

import { useState, useEffect } from 'react'
import { format, addMinutes } from 'date-fns'
import { pl } from 'date-fns/locale'
import { toast } from 'sonner'
import { AlertCircle } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ClientCombobox } from '@/components/admin/client-combobox'
import { createCalendarAppointment } from '@/actions/appointments'
import { START_HOUR, END_HOUR } from './constants'
import type { Treatment } from '@/types/database'
import type { TimeBlock } from '@/actions/time-blocks'

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120]

interface CreateAppointmentSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultDate: Date
  defaultHour: number
  defaultMinute: number
  defaultDurationMinutes?: number
  treatments: Pick<Treatment, 'id' | 'name' | 'duration_minutes' | 'price'>[]
  salonId: string
  timeBlocks?: TimeBlock[]
  onCreated: () => void
}

function overlapsTimeBlock(
  date: Date,
  hour: number,
  minute: number,
  duration: number,
  timeBlocks: TimeBlock[],
): boolean {
  const dateStr = format(date, 'yyyy-MM-dd')
  const start = new Date(`${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`)
  const end = addMinutes(start, duration)

  return timeBlocks.some((block) => {
    const blockStart = new Date(block.start_time)
    const blockEnd = new Date(block.end_time)
    return start < blockEnd && end > blockStart
  })
}

export function CreateAppointmentSheet({
  open,
  onOpenChange,
  defaultDate,
  defaultHour,
  defaultMinute,
  defaultDurationMinutes,
  treatments,
  salonId,
  timeBlocks = [],
  onCreated,
}: CreateAppointmentSheetProps) {
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>()
  const [treatmentId, setTreatmentId] = useState('')
  const [hour, setHour] = useState(defaultHour)
  const [minute, setMinute] = useState(defaultMinute)
  const [duration, setDuration] = useState(defaultDurationMinutes ?? 60)
  const [durationManuallySet, setDurationManuallySet] = useState(!!defaultDurationMinutes)
  const [notes, setNotes] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleOpenChange = (o: boolean) => {
    if (o) {
      setHour(defaultHour)
      setMinute(defaultMinute)
      setDuration(defaultDurationMinutes ?? 60)
      setDurationManuallySet(!!defaultDurationMinutes)
      setSelectedClientId(undefined)
      setTreatmentId('')
      setNotes('')
    }
    onOpenChange(o)
  }

  // When treatment changes, auto-update duration unless manually set
  const handleTreatmentChange = (id: string) => {
    setTreatmentId(id)
    if (!durationManuallySet) {
      const t = treatments.find((t) => t.id === id)
      if (t) setDuration(t.duration_minutes)
    }
  }

  const hasOverlap = overlapsTimeBlock(defaultDate, hour, minute, duration, timeBlocks)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClientId) { toast.error('Wybierz klienta'); return }
    if (!treatmentId) { toast.error('Wybierz zabieg'); return }
    if (hasOverlap) { toast.error('Ten czas jest zarezerwowany'); return }

    setIsLoading(true)
    const dateStr = format(defaultDate, 'yyyy-MM-dd')
    const startTime = new Date(
      `${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`,
    ).toISOString()

    const { error } = await createCalendarAppointment({
      salonId,
      clientId: selectedClientId,
      treatmentId,
      startTime,
      durationMinutes: duration,
      notes: notes || undefined,
    })

    setIsLoading(false)
    if (error) {
      toast.error('Nie udało się dodać wizyty')
    } else {
      onOpenChange(false)
      onCreated()
    }
  }

  const selectedTreatment = treatments.find((t) => t.id === treatmentId)

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader className="mb-2">
          <SheetTitle>Nowa wizyta</SheetTitle>
          <p className="text-sm text-muted-foreground capitalize">
            {format(defaultDate, 'EEEE, d MMMM yyyy', { locale: pl })}
            {' · '}
            {String(defaultHour).padStart(2, '0')}:{String(defaultMinute).padStart(2, '0')}
          </p>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 gap-4 overflow-y-auto pt-2 pb-4">
          {/* Overlap warning */}
          {hasOverlap && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">Ten czas jest zarezerwowany. Zmień godzinę lub czas trwania.</p>
            </div>
          )}

          {/* Client */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Klient</label>
            <ClientCombobox salonId={salonId} onSelect={setSelectedClientId} />
          </div>

          {/* Treatment */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Zabieg</label>
            <select
              value={treatmentId}
              onChange={(e) => handleTreatmentChange(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">-- Wybierz zabieg --</option>
              {treatments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} · {t.duration_minutes} min
                  {t.price != null ? ` · ${t.price} PLN` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Time */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Godzina</label>
            <div className="flex items-center gap-2">
              <select
                value={hour}
                onChange={(e) => setHour(Number(e.target.value))}
                className="flex-1 px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR).map((h) => (
                  <option key={h} value={h}>{String(h).padStart(2, '0')}</option>
                ))}
              </select>
              <span className="text-muted-foreground font-semibold">:</span>
              <select
                value={minute}
                onChange={(e) => setMinute(Number(e.target.value))}
                className="flex-1 px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                  <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <label className="text-sm font-medium">Czas trwania</label>
              <span className="text-xs text-muted-foreground">{duration} min</span>
            </div>
            {/* Quick picks */}
            <div className="flex flex-wrap gap-1.5">
              {DURATION_PRESETS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => { setDuration(d); setDurationManuallySet(true) }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    duration === d
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                  }`}
                >
                  {d} min
                </button>
              ))}
            </div>
            {/* Custom input */}
            <input
              type="number"
              min={5}
              step={5}
              value={duration}
              onChange={(e) => { setDuration(Number(e.target.value)); setDurationManuallySet(true) }}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Własny czas (min)"
            />
            {selectedTreatment && selectedTreatment.duration_minutes !== duration && (
              <p className="text-xs text-muted-foreground">
                Domyślny czas zabiegu: {selectedTreatment.duration_minutes} min
                <button
                  type="button"
                  className="ml-1.5 text-primary hover:underline"
                  onClick={() => { setDuration(selectedTreatment.duration_minutes); setDurationManuallySet(false) }}
                >
                  Przywróć
                </button>
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Notatki <span className="text-muted-foreground font-normal">(opcjonalne)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Np. klientka prosi o..."
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="flex gap-3 mt-auto pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Anuluj
            </Button>
            <Button type="submit" className="flex-1" disabled={isLoading || hasOverlap}>
              {isLoading ? 'Zapisywanie...' : 'Zapisz wizytę'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
