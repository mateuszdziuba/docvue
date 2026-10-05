'use client'

import { addMinutes, format } from 'date-fns'
import { pl } from 'date-fns/locale'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { createTimeBlock } from '@/src/server/time-blocks'
import type { StaffMember } from '@/types/database'

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120]
const ALL_STAFF_VALUE = '__all__'

interface ReserveTimeSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: Date
  hour: number
  minute: number
  durationMinutes: number
  salonId: string
  staffMembers?: Pick<StaffMember, 'id' | 'name'>[]
  defaultStaffId?: string | null
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
  staffMembers = [],
  defaultStaffId,
  onCreated,
}: ReserveTimeSheetProps) {
  const durationRef = useRef<HTMLInputElement | null>(null)
  const [label, setLabel] = useState('')
  const [staffId, setStaffId] = useState<string>(defaultStaffId ?? '')
  const [duration, setDuration] = useState(defaultDuration)
  const [durationError, setDurationError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setLabel('')
      setStaffId(defaultStaffId ?? '')
      setDuration(defaultDuration)
      setDurationError(null)
    }
    onOpenChange(nextOpen)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!Number.isFinite(duration) || duration < 5) {
      setDurationError('Czas trwania musi wynosić co najmniej 5 minut.')
      durationRef.current?.focus()
      return
    }
    setDurationError(null)

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
      staffId: staffId || null,
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

        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-col flex-1 gap-4 overflow-y-auto pt-2"
        >
          <div className="space-y-1.5">
            <label htmlFor="reserve-time-label" className="text-sm font-medium">
              Opis <span className="text-muted-foreground font-normal">(opcjonalny)</span>
            </label>
            <Input
              id="reserve-time-label"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Np. Przerwa, Urlop..."
              className="w-full rounded-lg min-h-11 md:min-h-10"
            />
          </div>

          {staffMembers.length > 0 && (
            <div className="space-y-1.5">
              <label htmlFor="reserve-time-staff" className="text-sm font-medium">
                Pracownik
              </label>
              <Select
                value={staffId === '' ? ALL_STAFF_VALUE : staffId}
                onValueChange={(value) => setStaffId(value === ALL_STAFF_VALUE ? '' : value)}
              >
                <SelectTrigger
                  id="reserve-time-staff"
                  className="w-full rounded-lg min-h-11 md:min-h-10"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_STAFF_VALUE} className="min-h-11 md:min-h-8">
                    Cały salon (blokuje wszystkich)
                  </SelectItem>
                  {staffMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id} className="min-h-11 md:min-h-8">
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Blokada obejmie tylko wybraną osobę; „Cały salon” zablokuje wszystkich.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <label htmlFor="reserve-time-duration" className="text-sm font-medium">
                Czas trwania
              </label>
              <span className="text-xs text-muted-foreground">{duration} min</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {DURATION_PRESETS.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant={duration === preset ? 'default' : 'outline'}
                  aria-pressed={duration === preset}
                  onClick={() => {
                    setDuration(preset)
                    setDurationError(null)
                  }}
                  className={`px-3 rounded-lg text-sm font-medium min-h-11 md:min-h-9 ${
                    duration === preset ? '' : 'text-muted-foreground'
                  }`}
                >
                  {preset} min
                </Button>
              ))}
            </div>
            <Input
              id="reserve-time-duration"
              ref={durationRef}
              type="number"
              min={5}
              step={5}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              aria-invalid={Boolean(durationError)}
              aria-describedby={durationError ? 'reserve-time-duration-error' : undefined}
              className="w-full rounded-lg min-h-11 md:min-h-10 aria-[invalid=true]:border-destructive"
              placeholder="Własny czas (min)"
            />
            {durationError && (
              <p id="reserve-time-duration-error" role="alert" className="text-xs text-destructive">
                {durationError}
              </p>
            )}
          </div>

          <div className="sticky bottom-0 z-10 -mx-6 mt-auto px-6 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] bg-background border-t border-border flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 min-h-11"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Anuluj
            </Button>
            <Button type="submit" className="flex-1 min-h-11" disabled={isLoading}>
              {isLoading ? 'Zapisywanie...' : 'Zarezerwuj'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
