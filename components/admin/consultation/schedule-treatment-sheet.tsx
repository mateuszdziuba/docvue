'use client'

import { addDays, format } from 'date-fns'
import { CalendarPlus, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { createCalendarAppointment } from '@/src/server/appointments'
import type { StaffMember, Treatment } from '@/types/database'
import { DateField, TimePicker } from './fields'

const priceFormatter = new Intl.NumberFormat('pl-PL', {
  style: 'currency',
  currency: 'PLN',
})
const UNASSIGNED_STAFF = '__unassigned__'

type ScheduleTreatment = Pick<Treatment, 'id' | 'name' | 'duration_minutes' | 'price'>

export function ScheduleTreatmentSheet({
  open,
  onOpenChange,
  clientId,
  clientName,
  treatment,
  salonId,
  staffMembers = [],
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string
  clientName: string
  treatment: ScheduleTreatment | null
  salonId: string
  staffMembers?: Pick<StaffMember, 'id' | 'name'>[]
  onCreated?: () => void
}) {
  const [date, setDate] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'))
  const [time, setTime] = useState('10:00')
  const [duration, setDuration] = useState(treatment?.duration_minutes ?? 60)
  const [staffId, setStaffId] = useState('')
  const [notes, setNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setDate(format(addDays(new Date(), 1), 'yyyy-MM-dd'))
    setTime('10:00')
    setDuration(treatment?.duration_minutes ?? 60)
    setStaffId('')
    setNotes('')
    setError(null)
  }, [open, treatment])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!treatment) return

    const start = new Date(`${date}T${time || '10:00'}:00`)
    if (Number.isNaN(start.getTime())) {
      setError('Wybierz poprawną datę i godzinę.')
      return
    }
    if (!Number.isFinite(duration) || duration < 5) {
      setError('Czas trwania musi wynosić co najmniej 5 minut.')
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      const result = await createCalendarAppointment({
        salonId,
        clientId,
        treatmentId: treatment.id,
        startTime: start.toISOString(),
        durationMinutes: duration,
        notes: notes.trim() || undefined,
        staffId: staffId && staffId !== UNASSIGNED_STAFF ? staffId : undefined,
      })
      if (result.error) {
        setError(result.error)
        return
      }
      toast.success('Wizyta została zaplanowana')
      onOpenChange(false)
      onCreated?.()
    } catch {
      setError('Nie udało się zaplanować wizyty.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader className="mb-1">
          <SheetTitle className="flex items-center gap-2 font-serif text-2xl font-normal">
            <CalendarPlus className="h-5 w-5 text-primary" aria-hidden="true" />
            Zaplanuj wizytę
          </SheetTitle>
          <SheetDescription>
            {clientName}
            {treatment ? ` · ${treatment.name}` : ''}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pt-1">
            {treatment ? (
              <div className="rounded-2xl border border-border/60 bg-surface-container-low/60 p-4">
                <p className="text-sm font-medium text-foreground">{treatment.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {treatment.duration_minutes} min
                  {treatment.price != null ? ` · ${priceFormatter.format(treatment.price)}` : ''}
                </p>
              </div>
            ) : null}

            {error ? (
              <div
                role="alert"
                className="rounded-xl border border-destructive/25 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive"
              >
                {error}
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <DateField label="Data wizyty" value={date} onChange={setDate} />
              <TimePicker label="Godzina" value={time} onChange={setTime} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="schedule-duration" className="text-sm font-medium text-foreground">
                Czas trwania (min)
              </Label>
              <Input
                id="schedule-duration"
                type="number"
                min={5}
                step={5}
                value={duration}
                onChange={(event) => setDuration(Number(event.target.value))}
                className="min-h-11 rounded-xl border-border bg-background px-4 text-base"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="schedule-staff" className="text-sm font-medium text-foreground">
                Pracownik
              </Label>
              <Select
                value={staffId || UNASSIGNED_STAFF}
                onValueChange={(value) => setStaffId(value === UNASSIGNED_STAFF ? '' : value)}
              >
                <SelectTrigger
                  id="schedule-staff"
                  aria-label="Pracownik"
                  className="min-h-11 rounded-xl border-input bg-background"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED_STAFF}>Nieprzypisany</SelectItem>
                  {staffMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="schedule-notes" className="text-sm font-medium text-foreground">
                Notatka do wizyty (opcjonalnie)
              </Label>
              <Textarea
                id="schedule-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                placeholder="Np. pierwszy zabieg z planu terapii — etap 1"
                className="rounded-xl border-border bg-background px-4 py-3"
              />
            </div>
          </div>

          <SheetFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Anuluj
            </Button>
            <Button type="submit" disabled={isSaving || !treatment}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
                  Planowanie…
                </>
              ) : (
                'Zaplanuj wizytę'
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
