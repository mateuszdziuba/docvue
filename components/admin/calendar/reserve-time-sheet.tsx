'use client'

import { useState } from 'react'
import { format, addMinutes } from 'date-fns'
import { pl } from 'date-fns/locale'
import { toast } from 'sonner'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { createTimeBlock } from '@/actions/time-blocks'

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120]

interface ReserveTimeSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: Date
  hour: number
  minute: number
  durationMinutes: number
  salonId: string
  onCreated: () => void
}

export function ReserveTimeSheet({
  open,
  onOpenChange,
  date,
  hour,
  minute,
  durationMinutes: defaultDuration,
  salonId,
  onCreated,
}: ReserveTimeSheetProps) {
  const [label, setLabel] = useState('')
  const [duration, setDuration] = useState(defaultDuration)
  const [isLoading, setIsLoading] = useState(false)

  const handleOpenChange = (o: boolean) => {
    if (o) {
      setLabel('')
      setDuration(defaultDuration)
    }
    onOpenChange(o)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    const dateStr = format(date, 'yyyy-MM-dd')
    const start = new Date(
      `${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`,
    )
    const end = addMinutes(start, duration)
    const { error } = await createTimeBlock({
      salonId,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      label: label || undefined,
    })
    setIsLoading(false)
    if (error) {
      console.error('[time_blocks] reserve error:', error)
      toast.error(`Nie udało się zarezerwować czasu: ${error}`)
    } else {
      onOpenChange(false)
      onCreated()
      toast.success('Czas zarezerwowany')
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader className="mb-2">
          <SheetTitle>Zarezerwuj czas</SheetTitle>
          <p className="text-sm text-muted-foreground capitalize">
            {format(date, 'EEEE, d MMMM yyyy', { locale: pl })}
            {' · '}
            {String(hour).padStart(2, '0')}:{String(minute).padStart(2, '0')}
          </p>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 gap-4 pt-2 pb-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Opis <span className="text-muted-foreground font-normal">(opcjonalny)</span>
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Np. Przerwa, Urlop..."
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <label className="text-sm font-medium">Czas trwania</label>
              <span className="text-xs text-muted-foreground">{duration} min</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {DURATION_PRESETS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
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
            <input
              type="number"
              min={5}
              step={5}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Własny czas (min)"
            />
          </div>

          <div className="flex gap-3 mt-auto pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Anuluj
            </Button>
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? 'Zapisywanie...' : 'Zarezerwuj'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
