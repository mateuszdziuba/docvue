'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import { toast } from 'sonner'
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

interface CreateAppointmentSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultDate: Date
  defaultHour: number
  defaultMinute: number
  treatments: Pick<Treatment, 'id' | 'name' | 'duration_minutes' | 'price'>[]
  salonId: string
  onCreated: () => void
}

export function CreateAppointmentSheet({
  open,
  onOpenChange,
  defaultDate,
  defaultHour,
  defaultMinute,
  treatments,
  salonId,
  onCreated,
}: CreateAppointmentSheetProps) {
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>()
  const [treatmentId, setTreatmentId] = useState('')
  const [hour, setHour] = useState(defaultHour)
  const [minute, setMinute] = useState(defaultMinute)
  const [notes, setNotes] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleOpenChange = (o: boolean) => {
    if (o) {
      setHour(defaultHour)
      setMinute(defaultMinute)
      setSelectedClientId(undefined)
      setTreatmentId('')
      setNotes('')
    }
    onOpenChange(o)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClientId) { toast.error('Wybierz klienta'); return }
    if (!treatmentId) { toast.error('Wybierz zabieg'); return }

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

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 gap-5 overflow-y-auto pt-2 pb-4">
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
              onChange={(e) => setTreatmentId(e.target.value)}
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
            {selectedTreatment && (
              <p className="text-xs text-muted-foreground">
                Czas trwania: {selectedTreatment.duration_minutes} min
              </p>
            )}
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
                {[0, 15, 30, 45].map((m) => (
                  <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Notatki <span className="text-muted-foreground font-normal">(opcjonalne)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Np. klientka prosi o..."
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="flex gap-3 mt-auto pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Anuluj
            </Button>
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? 'Zapisywanie...' : 'Zapisz wizytę'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
