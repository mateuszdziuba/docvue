import { useState } from 'react'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'

import { Button } from '@/components/ui/button'

export interface Slot {
  start: string
  end: string
  treatmentId?: string
  salonId?: string
}

interface ChatSlotPickerProps {
  slots: Slot[]
  onSelect: (slot: Slot) => void
}

export function ChatSlotPicker({ slots, onSelect }: ChatSlotPickerProps) {
  const [showAll, setShowAll] = useState(false)

  if (slots.length === 0) {
    return (
      <div className="my-2 p-4 bg-card border border-border rounded-xl text-center">
        <p className="text-sm text-muted-foreground">Brak wolnych terminów w tym dniu.</p>
      </div>
    )
  }

  // Group slots by date
  const grouped: Record<string, Slot[]> = {}
  for (const slot of slots) {
    const dateKey = format(new Date(slot.start), 'yyyy-MM-dd')
    if (!grouped[dateKey]) grouped[dateKey] = []
    grouped[dateKey].push(slot)
  }

  return (
    <div className="space-y-3 my-2">
      <p className="text-xs text-muted-foreground">
        Wybierz godzinę, aby zobaczyć podsumowanie i potwierdzić wizytę.
      </p>
      {Object.entries(grouped).map(([dateKey, daySlots]) => (
        <div key={dateKey}>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
            {format(new Date(dateKey), 'EEEE, d MMMM', { locale: pl })}
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {daySlots.slice(0, showAll ? undefined : 9).map((slot) => (
              <button
                type="button"
                key={slot.start}
                onClick={() => onSelect(slot)}
                className="px-2 py-2 min-h-11 text-xs font-medium rounded-lg border border-border bg-card hover:border-primary hover:bg-primary/5 transition-colors text-foreground"
              >
                {format(new Date(slot.start), 'HH:mm')}
              </button>
            ))}
            {daySlots.length > 9 && (
              <Button
                type="button"
                variant="outline"
                className="col-span-full min-h-11 w-full mt-1"
                onClick={() => setShowAll(!showAll)}
              >
                {showAll ? 'Pokaż mniej' : `Pokaż więcej terminów (${daySlots.length - 9})`}
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
