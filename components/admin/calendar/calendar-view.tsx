'use client'

import { useCallback, useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
} from '@dnd-kit/core'
import { restrictToWindowEdges } from '@dnd-kit/modifiers'
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  parseISO,
  getHours,
  getMinutes,
  startOfDay,
  setHours,
  setMinutes,
  addMinutes,
} from 'date-fns'
import { toast } from 'sonner'
import { CalendarHeader } from './calendar-header'
import { CalendarGrid } from './calendar-grid'
import { AppointmentDragOverlay } from './calendar-appointment'
import { CreateAppointmentSheet } from './create-appointment-sheet'
import {
  getCalendarAppointments,
  updateAppointmentTiming,
  updateCalendarAppointmentStatus,
  deleteCalendarAppointment,
  type CalendarAppointment,
} from '@/actions/appointments'
import { PIXELS_PER_MINUTE, SNAP_MINUTES, START_HOUR, END_HOUR } from './constants'
import type { Treatment } from '@/types/database'

interface CalendarViewProps {
  initialAppointments: CalendarAppointment[]
  treatments: Pick<Treatment, 'id' | 'name' | 'duration_minutes' | 'price'>[]
  salonId: string
  initialWeekStart: string
}

export function CalendarView({
  initialAppointments,
  treatments,
  salonId,
  initialWeekStart,
}: CalendarViewProps) {
  const [appointments, setAppointments] = useState<CalendarAppointment[]>(initialAppointments)
  const [weekStart, setWeekStart] = useState<Date>(() => parseISO(initialWeekStart))
  const [isLoading, setIsLoading] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [createSheet, setCreateSheet] = useState<{
    date: Date
    hour: number
    minute: number
  } | null>(null)

  const activeAppointment = activeId
    ? (appointments.find((a) => a.id === activeId) ?? null)
    : null

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  // ── Week navigation ─────────────────────────────────────────────────────────

  const navigateWeek = useCallback(
    async (direction: 'prev' | 'next' | 'today') => {
      let next: Date
      if (direction === 'today') {
        next = startOfWeek(new Date(), { weekStartsOn: 1 })
      } else if (direction === 'prev') {
        next = subWeeks(weekStart, 1)
      } else {
        next = addWeeks(weekStart, 1)
      }
      setWeekStart(next)
      setIsLoading(true)
      const fresh = await getCalendarAppointments(
        salonId,
        next,
        endOfWeek(next, { weekStartsOn: 1 }),
      )
      setAppointments(fresh)
      setIsLoading(false)
    },
    [weekStart, salonId],
  )

  // ── Drag to move ─────────────────────────────────────────────────────────────

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, delta, over } = event
      setActiveId(null)

      if (!over) return
      const appointmentId = active.id as string
      const appointment = appointments.find((a) => a.id === appointmentId)
      if (!appointment) return

      const targetDate = over.data.current?.date as Date | undefined
      if (!targetDate) return

      const originalStart = parseISO(appointment.start_time)
      const originalMins = getHours(originalStart) * 60 + getMinutes(originalStart)
      const deltaMins = Math.round((delta.y / PIXELS_PER_MINUTE) / SNAP_MINUTES) * SNAP_MINUTES
      const newTotalMins = originalMins + deltaMins

      // Clamp to grid bounds
      const clamped = Math.max(
        START_HOUR * 60,
        Math.min(END_HOUR * 60 - appointment.duration_minutes, newTotalMins),
      )
      const newStart = setMinutes(setHours(startOfDay(targetDate), Math.floor(clamped / 60)), clamped % 60)
      const newStartISO = newStart.toISOString()

      if (newStartISO === appointment.start_time) return

      // Optimistic
      setAppointments((prev) =>
        prev.map((a) => (a.id === appointmentId ? { ...a, start_time: newStartISO } : a)),
      )
      const { error } = await updateAppointmentTiming(appointmentId, newStartISO)
      if (error) {
        toast.error('Nie udało się przesunąć wizyty')
        setAppointments((prev) =>
          prev.map((a) =>
            a.id === appointmentId ? { ...a, start_time: appointment.start_time } : a,
          ),
        )
      }
    },
    [appointments],
  )

  // ── Drag bottom edge — resize end time ──────────────────────────────────────

  const handleResizeBottomStart = useCallback(
    (appointmentId: string, e: React.PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const apt = appointments.find((a) => a.id === appointmentId)
      if (!apt) return

      const startY = e.clientY
      const origDuration = apt.duration_minutes
      let curDuration = origDuration

      const onMove = (ev: PointerEvent) => {
        const dy = ev.clientY - startY
        const dMin = Math.round((dy / PIXELS_PER_MINUTE) / SNAP_MINUTES) * SNAP_MINUTES
        curDuration = Math.max(15, origDuration + dMin)
        setAppointments((prev) =>
          prev.map((a) =>
            a.id === appointmentId ? { ...a, duration_minutes: curDuration } : a,
          ),
        )
      }

      const onUp = async () => {
        document.removeEventListener('pointermove', onMove)
        const { error } = await updateAppointmentTiming(appointmentId, undefined, curDuration)
        if (error) {
          toast.error('Nie udało się zmienić czasu wizyty')
          setAppointments((prev) =>
            prev.map((a) =>
              a.id === appointmentId ? { ...a, duration_minutes: origDuration } : a,
            ),
          )
        }
      }

      document.addEventListener('pointermove', onMove)
      document.addEventListener('pointerup', onUp, { once: true })
    },
    [appointments],
  )

  // ── Drag top edge — resize start time (shifts start, keeps end fixed) ───────

  const handleResizeTopStart = useCallback(
    (appointmentId: string, e: React.PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const apt = appointments.find((a) => a.id === appointmentId)
      if (!apt) return

      const startY = e.clientY
      const origStart = parseISO(apt.start_time)
      const origDuration = apt.duration_minutes
      let curNewStart = origStart
      let curNewDuration = origDuration

      const origStartMins = getHours(origStart) * 60 + getMinutes(origStart)

      const onMove = (ev: PointerEvent) => {
        const dy = ev.clientY - startY
        const dMin = Math.round((dy / PIXELS_PER_MINUTE) / SNAP_MINUTES) * SNAP_MINUTES
        // Clamp: can't move before grid start, can't shrink below 15 min
        const maxDelta = origDuration - 15
        const minDelta = START_HOUR * 60 - origStartMins
        const clampedDelta = Math.max(minDelta, Math.min(maxDelta, dMin))
        curNewStart = addMinutes(origStart, clampedDelta)
        curNewDuration = origDuration - clampedDelta
        setAppointments((prev) =>
          prev.map((a) =>
            a.id === appointmentId
              ? { ...a, start_time: curNewStart.toISOString(), duration_minutes: curNewDuration }
              : a,
          ),
        )
      }

      const onUp = async () => {
        document.removeEventListener('pointermove', onMove)
        const { error } = await updateAppointmentTiming(
          appointmentId,
          curNewStart.toISOString(),
          curNewDuration,
        )
        if (error) {
          toast.error('Nie udało się zmienić czasu wizyty')
          setAppointments((prev) =>
            prev.map((a) =>
              a.id === appointmentId
                ? { ...a, start_time: apt.start_time, duration_minutes: origDuration }
                : a,
            ),
          )
        }
      }

      document.addEventListener('pointermove', onMove)
      document.addEventListener('pointerup', onUp, { once: true })
    },
    [appointments],
  )

  // ── Delete ───────────────────────────────────────────────────────────────────

  const handleDelete = useCallback(async (appointmentId: string) => {
    setAppointments((prev) => prev.filter((a) => a.id !== appointmentId))
    const { error } = await deleteCalendarAppointment(appointmentId)
    if (error) {
      toast.error('Nie udało się usunąć wizyty')
    } else {
      toast.success('Wizyta usunięta')
    }
  }, [])

  // ── Status change ─────────────────────────────────────────────────────────────

  const handleStatusChange = useCallback(
    async (appointmentId: string, status: CalendarAppointment['status']) => {
      setAppointments((prev) =>
        prev.map((a) => (a.id === appointmentId ? { ...a, status } : a)),
      )
      const { error } = await updateCalendarAppointmentStatus(appointmentId, status)
      if (error) toast.error('Nie udało się zmienić statusu')
    },
    [],
  )

  // ── Create ────────────────────────────────────────────────────────────────────

  const handleSlotClick = useCallback((date: Date, hour: number, minute: number) => {
    setCreateSheet({ date, hour, minute })
  }, [])

  const handleAppointmentCreated = useCallback(async () => {
    const fresh = await getCalendarAppointments(
      salonId,
      weekStart,
      endOfWeek(weekStart, { weekStartsOn: 1 }),
    )
    setAppointments(fresh)
    toast.success('Wizyta dodana')
  }, [weekStart, salonId])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <CalendarHeader weekStart={weekStart} isLoading={isLoading} onNavigate={navigateWeek} />

      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        modifiers={[restrictToWindowEdges]}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <CalendarGrid
          weekStart={weekStart}
          appointments={appointments}
          onSlotClick={handleSlotClick}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
          onResizeBottomStart={handleResizeBottomStart}
          onResizeTopStart={handleResizeTopStart}
        />

        <DragOverlay dropAnimation={null}>
          {activeAppointment ? (
            <AppointmentDragOverlay
              appointment={activeAppointment}
              height={activeAppointment.duration_minutes * PIXELS_PER_MINUTE}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {createSheet && (
        <CreateAppointmentSheet
          open
          onOpenChange={(o) => !o && setCreateSheet(null)}
          defaultDate={createSheet.date}
          defaultHour={createSheet.hour}
          defaultMinute={createSheet.minute}
          treatments={treatments}
          salonId={salonId}
          onCreated={handleAppointmentCreated}
        />
      )}
    </div>
  )
}
