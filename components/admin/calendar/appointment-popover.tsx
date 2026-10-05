'use client'

import { addMinutes, format, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'
import { Clock, ExternalLink, Pencil, Scissors, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  APPOINTMENT_STATUS_CONFIG,
  type AppointmentStatus,
  StatusBadge,
} from '@/components/admin/status-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Link } from '@/lib/link-compat'
import type { CalendarAppointment } from '@/src/server/appointments'
import type { StaffMember } from '@/types/database'
import { staffColor, staffInitials } from './staff-colors'

export interface AppointmentUpdateChanges {
  start_time?: string
  duration_minutes?: number
  staff_id?: string | null
  status?: AppointmentStatus
}

interface AppointmentPopoverProps {
  appointment: CalendarAppointment
  children: React.ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
  staffMembers?: Pick<StaffMember, 'id' | 'name'>[]
  onUpdate?: (id: string, changes: AppointmentUpdateChanges) => Promise<{ error?: string | null }>
  onStatusChange?: (id: string, status: CalendarAppointment['status']) => void
}

const DURATION_OPTIONS = [15, 30, 45, 60, 75, 90, 120, 180]
const UNASSIGNED_STAFF_VALUE = '__unassigned__'

export function AppointmentPopover({
  appointment,
  children,
  open,
  onOpenChange,
  staffMembers = [],
  onUpdate,
  onStatusChange,
}: AppointmentPopoverProps) {
  const startDate = parseISO(appointment.start_time)
  const endDate = addMinutes(startDate, appointment.duration_minutes)
  const staffName = appointment.staff_member?.name ?? null
  const color = staffColor(appointment.staff_member?.id ?? appointment.staff_id)

  const [editing, setEditing] = useState(false)
  const [dateValue, setDateValue] = useState(format(startDate, 'yyyy-MM-dd'))
  const [timeValue, setTimeValue] = useState(format(startDate, 'HH:mm'))
  const [duration, setDuration] = useState(appointment.duration_minutes)
  const [staffId, setStaffId] = useState(appointment.staff_id ?? '')
  const [status, setStatus] = useState<AppointmentStatus>(appointment.status)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!editing) return
    const freshStart = parseISO(appointment.start_time)
    setDateValue(format(freshStart, 'yyyy-MM-dd'))
    setTimeValue(format(freshStart, 'HH:mm'))
    setDuration(appointment.duration_minutes)
    setStaffId(appointment.staff_id ?? '')
    setStatus(appointment.status)
    setError(null)
  }, [
    editing,
    appointment.start_time,
    appointment.duration_minutes,
    appointment.staff_id,
    appointment.status,
  ])

  const handleSave = async () => {
    if (!onUpdate) return
    const parsedStart = new Date(`${dateValue}T${timeValue}:00`)
    if (Number.isNaN(parsedStart.getTime())) {
      setError('Podaj prawidłową datę i godzinę')
      return
    }
    if (!Number.isFinite(duration) || duration < 5) {
      setError('Czas trwania musi wynosić co najmniej 5 minut')
      return
    }

    setSaving(true)
    setError(null)
    const result = await onUpdate(appointment.id, {
      start_time: parsedStart.toISOString(),
      duration_minutes: duration,
      staff_id: staffId === '' ? null : staffId,
      status,
    })
    setSaving(false)

    if (result?.error) {
      setError(result.error)
      toast.error(result.error)
      return
    }
    toast.success('Zaktualizowano termin wizyty')
    setEditing(false)
    onOpenChange(false)
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-[calc(100vw-2rem)] sm:w-80 p-0 shadow-xl max-h-[70vh] overflow-y-auto"
        side="right"
        align="start"
        sideOffset={8}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-border">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-semibold shrink-0">
              {appointment.client.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground text-sm leading-tight truncate">
                {appointment.client.name}
              </p>
              {appointment.client.phone && (
                <p className="text-xs text-muted-foreground mt-0.5">{appointment.client.phone}</p>
              )}
            </div>
            <StatusBadge status={appointment.status} withIcon={false} className="shrink-0" />
          </div>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Scissors className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
            <span className="text-foreground">{appointment.treatment.name}</span>
            {appointment.treatment.price != null && (
              <span className="ml-auto text-muted-foreground text-xs">
                {appointment.treatment.price} PLN
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
            <div>
              <span className="text-foreground">
                {format(startDate, 'EEEE, d MMMM', { locale: pl })}
              </span>
              <br />
              <span className="text-muted-foreground">
                {format(startDate, 'HH:mm')} – {format(endDate, 'HH:mm')}{' '}
                <span className="text-xs">({appointment.duration_minutes} min)</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
            <span
              className={`flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${color.containerClass}`}
            >
              <span
                className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${color.containerClass} border ${color.borderClass}`}
                aria-hidden="true"
              >
                {staffName ? staffInitials(staffName) : '—'}
              </span>
              {staffName ?? 'Nieprzypisany'}
            </span>
          </div>

          {appointment.notes && (
            <div className="bg-secondary/60 rounded-lg p-2.5">
              <p className="text-xs text-muted-foreground leading-relaxed">{appointment.notes}</p>
            </div>
          )}

          {onUpdate && (
            <div className="pt-1 border-t border-border/60">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditing((prev) => !prev)}
                aria-expanded={editing}
                aria-controls="appointment-edit-section"
                className="flex items-center gap-2 w-full px-2 mt-2 text-sm font-medium rounded-lg justify-start min-h-11 md:min-h-9"
              >
                <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                Edytuj termin
              </Button>

              {editing && (
                <div id="appointment-edit-section" className="space-y-3 mt-2">
                  <div className="grid grid-cols-2 gap-2">
                    <label htmlFor="appointment-edit-date" className="space-y-1 block">
                      <span className="text-xs font-medium text-muted-foreground">Data</span>
                      <Input
                        id="appointment-edit-date"
                        type="date"
                        value={dateValue}
                        onChange={(e) => setDateValue(e.target.value)}
                        className="w-full rounded-lg min-h-11 md:min-h-9"
                      />
                    </label>
                    <label htmlFor="appointment-edit-time" className="space-y-1 block">
                      <span className="text-xs font-medium text-muted-foreground">Godzina</span>
                      <Input
                        id="appointment-edit-time"
                        type="time"
                        value={timeValue}
                        onChange={(e) => setTimeValue(e.target.value)}
                        className="w-full rounded-lg min-h-11 md:min-h-9"
                      />
                    </label>
                  </div>

                  <label htmlFor="appointment-edit-duration" className="space-y-1 block">
                    <span className="text-xs font-medium text-muted-foreground">Czas trwania</span>
                    <Select
                      value={String(duration)}
                      onValueChange={(value) => setDuration(Number(value))}
                    >
                      <SelectTrigger
                        id="appointment-edit-duration"
                        className="w-full rounded-lg min-h-11 md:min-h-9"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[...new Set([...DURATION_OPTIONS, appointment.duration_minutes])]
                          .sort((a, b) => a - b)
                          .map((minutes) => (
                            <SelectItem
                              key={minutes}
                              value={String(minutes)}
                              className="min-h-11 md:min-h-8"
                            >
                              {minutes} min
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </label>

                  {(staffMembers.length > 0 || appointment.staff_id) && (
                    <label htmlFor="appointment-edit-staff" className="space-y-1 block">
                      <span className="text-xs font-medium text-muted-foreground">Pracownik</span>
                      <Select
                        value={staffId === '' ? UNASSIGNED_STAFF_VALUE : staffId}
                        onValueChange={(value) =>
                          setStaffId(value === UNASSIGNED_STAFF_VALUE ? '' : value)
                        }
                      >
                        <SelectTrigger
                          id="appointment-edit-staff"
                          className="w-full rounded-lg min-h-11 md:min-h-9"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem
                            value={UNASSIGNED_STAFF_VALUE}
                            className="min-h-11 md:min-h-8"
                          >
                            Nieprzypisany
                          </SelectItem>
                          {staffMembers.map((member) => (
                            <SelectItem
                              key={member.id}
                              value={member.id}
                              className="min-h-11 md:min-h-8"
                            >
                              {member.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </label>
                  )}

                  <fieldset className="space-y-1.5">
                    <legend className="text-xs font-medium text-muted-foreground">Status</legend>
                    <div className="flex flex-wrap gap-1.5">
                      {(Object.keys(APPOINTMENT_STATUS_CONFIG) as AppointmentStatus[]).map((s) => (
                        <Button
                          key={s}
                          type="button"
                          variant={status === s ? 'default' : 'outline'}
                          onClick={() => setStatus(s)}
                          aria-pressed={status === s}
                          className={`px-2.5 rounded-lg text-xs font-medium min-h-11 md:min-h-8 ${
                            status === s ? '' : 'text-muted-foreground'
                          }`}
                        >
                          {APPOINTMENT_STATUS_CONFIG[s].label}
                        </Button>
                      ))}
                    </div>
                  </fieldset>

                  {error && (
                    <p role="alert" className="text-xs text-destructive">
                      {error}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditing(false)}
                      className="flex-1 px-3 text-sm font-medium rounded-lg min-h-11 md:min-h-9"
                    >
                      Anuluj
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 px-3 text-sm font-medium rounded-lg min-h-11 md:min-h-9"
                    >
                      {saving ? 'Zapisywanie...' : 'Zapisz zmiany'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {!onUpdate && onStatusChange && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(Object.keys(APPOINTMENT_STATUS_CONFIG) as AppointmentStatus[]).map((s) => (
                <Button
                  key={s}
                  type="button"
                  variant={appointment.status === s ? 'default' : 'outline'}
                  onClick={() => onStatusChange(appointment.id, s)}
                  aria-pressed={appointment.status === s}
                  className={`px-2.5 rounded-lg text-xs font-medium min-h-11 md:min-h-8 ${
                    appointment.status === s ? '' : 'text-muted-foreground'
                  }`}
                >
                  {APPOINTMENT_STATUS_CONFIG[s].label}
                </Button>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 pb-4">
          <Link
            href={`/dashboard/visits/${appointment.id}`}
            className="flex items-center justify-center gap-2 w-full px-3 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors min-h-11 md:min-h-9"
            onClick={() => onOpenChange(false)}
          >
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            Szczegóły wizyty
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  )
}
