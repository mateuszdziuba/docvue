'use client'

import { addMinutes, format } from 'date-fns'
import { pl } from 'date-fns/locale'
import { AlertCircle } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { ClientCombobox } from '@/components/admin/client-combobox'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { createCalendarAppointment } from '@/src/server/appointments'
import type { TimeBlock } from '@/src/server/time-blocks'
import type { StaffMember, Treatment } from '@/types/database'
import { END_HOUR, START_HOUR } from './constants'

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120]
const UNASSIGNED_STAFF_VALUE = '__unassigned__'

interface CreateAppointmentSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultDate: Date
  defaultHour: number
  defaultMinute: number
  defaultDurationMinutes?: number
  defaultStaffId?: string | null
  treatments: Pick<Treatment, 'id' | 'name' | 'duration_minutes' | 'price'>[]
  staffMembers?: Pick<StaffMember, 'id' | 'name'>[]
  salonId: string
  timeBlocks?: TimeBlock[]
  onCreated: () => void
}

interface FormErrors {
  client?: string
  treatment?: string
  duration?: string
}

function overlapsTimeBlock(
  date: Date,
  hour: number,
  minute: number,
  duration: number,
  timeBlocks: TimeBlock[],
): boolean {
  const dateStr = format(date, 'yyyy-MM-dd')
  const start = new Date(
    `${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`,
  )
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
  defaultStaffId,
  treatments,
  staffMembers = [],
  salonId,
  timeBlocks = [],
  onCreated,
}: CreateAppointmentSheetProps) {
  const clientRef = useRef<HTMLButtonElement | null>(null)
  const durationRef = useRef<HTMLInputElement | null>(null)

  const [selectedClientId, setSelectedClientId] = useState<string | undefined>()
  const [treatmentId, setTreatmentId] = useState('')
  const [staffId, setStaffId] = useState<string>(defaultStaffId ?? '')
  const [hour, setHour] = useState(defaultHour)
  const [minute, setMinute] = useState(defaultMinute)
  const [duration, setDuration] = useState(defaultDurationMinutes ?? 60)
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(false)

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setHour(defaultHour)
      setMinute(defaultMinute)
      setDuration(defaultDurationMinutes ?? 60)
      setSelectedClientId(undefined)
      setTreatmentId('')
      setStaffId(defaultStaffId ?? '')
      setNotes('')
      setErrors({})
    }
    onOpenChange(nextOpen)
  }

  const handleTreatmentChange = (id: string) => {
    setTreatmentId(id)
    setErrors((prev) => ({ ...prev, treatment: undefined }))
  }

  const hasOverlap = overlapsTimeBlock(defaultDate, hour, minute, duration, timeBlocks)
  const errorList = Object.values(errors).filter((value): value is string => Boolean(value))

  const treatmentOptions = treatments.map((treatment) => ({
    value: treatment.id,
    label: treatment.name,
    hint: `${treatment.duration_minutes} min${
      treatment.price != null ? ` · ${treatment.price} zł` : ''
    }`,
  }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const nextErrors: FormErrors = {}
    if (!selectedClientId) nextErrors.client = 'Wybierz klienta.'
    if (!treatmentId) nextErrors.treatment = 'Wybierz zabieg.'
    if (!Number.isFinite(duration) || duration < 5)
      nextErrors.duration = 'Czas trwania musi wynosić co najmniej 5 minut.'

    setErrors(nextErrors)

    if (nextErrors.client) {
      clientRef.current?.focus()
      return
    }
    if (nextErrors.treatment) {
      document.getElementById('create-appointment-treatment')?.focus()
      return
    }
    if (nextErrors.duration) {
      durationRef.current?.focus()
      return
    }
    if (hasOverlap) {
      toast.error('Ten czas jest zarezerwowany')
      return
    }

    setIsLoading(true)
    const dateStr = format(defaultDate, 'yyyy-MM-dd')
    const startTime = new Date(
      `${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`,
    ).toISOString()

    const result = await createCalendarAppointment({
      salonId,
      clientId: selectedClientId ?? '',
      treatmentId,
      startTime,
      durationMinutes: duration,
      notes: notes || undefined,
      staffId: staffId || undefined,
    })

    setIsLoading(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      onOpenChange(false)
      onCreated()
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader className="mb-1">
          <SheetTitle>Nowa wizyta</SheetTitle>
          <p className="text-sm text-muted-foreground capitalize">
            {format(defaultDate, 'EEEE, d MMMM yyyy', { locale: pl })}
          </p>
        </SheetHeader>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col flex-1 gap-3 min-h-0">
          <div className="flex-1 min-h-0 space-y-3 overflow-y-auto pt-1">
            {errorList.length > 0 && (
              <div
                role="alert"
                className="rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2.5"
              >
                <ul className="list-disc pl-5 space-y-0.5">
                  {errorList.map((message) => (
                    <li key={message} className="text-sm text-destructive">
                      {message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {hasOverlap && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2.5"
              >
                <AlertCircle
                  className="w-4 h-4 text-destructive shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <p className="text-sm text-destructive">
                  Ten czas jest zarezerwowany. Zmień godzinę lub czas trwania.
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="create-appointment-client" className="text-sm font-medium">
                Klient
              </label>
              <ClientCombobox
                id="create-appointment-client"
                ref={clientRef}
                salonId={salonId}
                onSelect={(clientId) => {
                  setSelectedClientId(clientId)
                  setErrors((prev) => ({ ...prev, client: undefined }))
                }}
                invalid={Boolean(errors.client)}
                describedBy={errors.client ? 'create-appointment-client-error' : undefined}
              />
              {errors.client && (
                <p id="create-appointment-client-error" className="text-xs text-destructive">
                  {errors.client}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <span id="create-appointment-treatment-label" className="text-sm font-medium">
                Zabieg
              </span>
              <Combobox
                id="create-appointment-treatment"
                options={treatmentOptions}
                value={treatmentId}
                onChange={handleTreatmentChange}
                aria-labelledby="create-appointment-treatment-label"
                placeholder="Wybierz zabieg…"
                searchPlaceholder="Szukaj zabiegu…"
                emptyText="Brak zabiegów."
                className="w-full min-h-11 md:min-h-10 aria-[invalid=true]:border-destructive"
              />
              {errors.treatment && (
                <p id="create-appointment-treatment-error" className="text-xs text-destructive">
                  {errors.treatment}
                </p>
              )}
            </div>

            {staffMembers.length > 0 && (
              <div className="space-y-1.5">
                <label htmlFor="create-appointment-staff" className="text-sm font-medium">
                  Pracownik
                </label>
                <Select
                  value={staffId === '' ? UNASSIGNED_STAFF_VALUE : staffId}
                  onValueChange={(value) =>
                    setStaffId(value === UNASSIGNED_STAFF_VALUE ? '' : value)
                  }
                >
                  <SelectTrigger
                    id="create-appointment-staff"
                    className="w-full rounded-lg min-h-11 md:min-h-10"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED_STAFF_VALUE} className="min-h-11 md:min-h-8">
                      -- Nieprzypisany --
                    </SelectItem>
                    {staffMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id} className="min-h-11 md:min-h-8">
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <fieldset className="space-y-1.5">
                <legend className="text-sm font-medium">Godzina</legend>
                <div className="flex items-center gap-1.5">
                  <label htmlFor="create-appointment-hour" className="sr-only">
                    Godzina
                  </label>
                  <Select value={String(hour)} onValueChange={(value) => setHour(Number(value))}>
                    <SelectTrigger
                      id="create-appointment-hour"
                      className="flex-1 rounded-lg min-h-11 md:min-h-10"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR).map(
                        (optionHour) => (
                          <SelectItem
                            key={optionHour}
                            value={String(optionHour)}
                            className="min-h-11 md:min-h-8"
                          >
                            {String(optionHour).padStart(2, '0')}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                  <span className="text-muted-foreground font-semibold" aria-hidden="true">
                    :
                  </span>
                  <label htmlFor="create-appointment-minute" className="sr-only">
                    Minuty
                  </label>
                  <Select
                    value={String(minute)}
                    onValueChange={(value) => setMinute(Number(value))}
                  >
                    <SelectTrigger
                      id="create-appointment-minute"
                      className="flex-1 rounded-lg min-h-11 md:min-h-10"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((optionMinute) => (
                        <SelectItem
                          key={optionMinute}
                          value={String(optionMinute)}
                          className="min-h-11 md:min-h-8"
                        >
                          {String(optionMinute).padStart(2, '0')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </fieldset>

              <div className="space-y-1.5">
                <label htmlFor="create-appointment-duration" className="text-sm font-medium">
                  Czas trwania (min)
                </label>
                <Input
                  id="create-appointment-duration"
                  ref={durationRef}
                  type="number"
                  min={5}
                  step={5}
                  value={duration}
                  onChange={(e) => {
                    setDuration(Number(e.target.value))
                    setErrors((prev) => ({ ...prev, duration: undefined }))
                  }}
                  aria-invalid={Boolean(errors.duration)}
                  aria-describedby={
                    errors.duration ? 'create-appointment-duration-error' : undefined
                  }
                  className="rounded-lg min-h-11 md:min-h-10 aria-[invalid=true]:border-destructive"
                />
                {errors.duration && (
                  <p id="create-appointment-duration-error" className="text-xs text-destructive">
                    {errors.duration}
                  </p>
                )}
              </div>
            </div>

            {treatmentId &&
              (() => {
                const treatment = treatments.find((item) => item.id === treatmentId)
                if (!treatment || treatment.duration_minutes === duration) return null
                return (
                  <p className="text-xs text-muted-foreground">
                    Domyślny czas zabiegu: {treatment.duration_minutes} min{' '}
                    <button
                      type="button"
                      className="font-medium text-primary underline-offset-2 hover:underline"
                      onClick={() => {
                        setDuration(treatment.duration_minutes)
                        setErrors((prev) => ({ ...prev, duration: undefined }))
                      }}
                    >
                      Ustaw
                    </button>
                  </p>
                )
              })()}

            <fieldset className="flex flex-wrap gap-1.5">
              <legend className="sr-only">Szybki wybór czasu</legend>
              {DURATION_PRESETS.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant={duration === preset ? 'default' : 'outline'}
                  aria-pressed={duration === preset}
                  onClick={() => {
                    setDuration(preset)
                    setErrors((prev) => ({ ...prev, duration: undefined }))
                  }}
                  className={`px-2.5 rounded-lg text-sm font-medium min-h-9 ${
                    duration === preset ? '' : 'text-muted-foreground'
                  }`}
                >
                  {preset} min
                </Button>
              ))}
            </fieldset>

            <div className="space-y-1.5">
              <label htmlFor="create-appointment-notes" className="text-sm font-medium">
                Notatki <span className="text-muted-foreground font-normal">(opcjonalne)</span>
              </label>
              <Textarea
                id="create-appointment-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Np. klientka prosi o..."
                className="w-full rounded-lg resize-none"
              />
            </div>
          </div>

          <div className="-mx-6 px-6 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] bg-background border-t border-border flex gap-3 shrink-0">
            <Button
              type="button"
              variant="outline"
              className="flex-1 min-h-11"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Anuluj
            </Button>
            <Button type="submit" className="flex-1 min-h-11" disabled={isLoading || hasOverlap}>
              {isLoading ? 'Zapisywanie...' : 'Zapisz wizytę'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
