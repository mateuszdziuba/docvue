'use client'

import {
  DndContext,
  type DragEndEvent,
  type DragMoveEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { restrictToWindowEdges } from '@dnd-kit/modifiers'
import { useNavigate, useSearch } from '@tanstack/react-router'
import {
  addDays,
  addMinutes,
  addMonths,
  addWeeks,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  getHours,
  getMinutes,
  isSameDay,
  parseISO,
  setHours,
  setMinutes,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns'
import { pl } from 'date-fns/locale'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { findConflicts } from '@/src/lib/appointment-overlap'
import {
  type CalendarAppointment,
  deleteCalendarAppointment,
  getCalendarAppointmentsFn,
  updateAppointmentFn,
  updateAppointmentTiming,
  updateCalendarAppointmentStatus,
} from '@/src/server/appointments'
import {
  createTimeBlock,
  deleteTimeBlock,
  getTimeBlocks,
  type TimeBlock,
} from '@/src/server/time-blocks'
import type { StaffMember, Treatment } from '@/types/database'
import type { AppointmentUpdateChanges } from './appointment-popover'
import { AppointmentDragOverlay } from './calendar-appointment'
import { CalendarGrid, type PendingSelection } from './calendar-grid'
import { CalendarHeader, StaffLegend, type ViewType } from './calendar-header'
import { CalendarMonthView } from './calendar-month-view'
import { CalendarSkeleton } from './calendar-skeleton'
import { CalendarStaffGrid } from './calendar-staff-grid'
import { END_HOUR, PIXELS_PER_MINUTE, START_HOUR } from './constants'
import { CreateAppointmentSheet } from './create-appointment-sheet'
import { ReserveTimeSheet } from './reserve-time-sheet'
import { SlotContextMenu } from './slot-context-menu'

interface CalendarViewProps {
  initialAppointments: CalendarAppointment[]
  initialTimeBlocks: TimeBlock[]
  treatments: Pick<Treatment, 'id' | 'name' | 'duration_minutes' | 'price'>[]
  salonId: string
  initialDate: string
  initialView?: ViewType
  initialStaffFilter?: string
  initialError?: string | null
  staff: StaffMember[]
}

function rangeForView(view: ViewType, anchor: Date): [Date, Date] {
  if (view === 'day') return [startOfDay(anchor), endOfDay(anchor)]
  if (view === 'month') {
    return [
      startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 }),
      endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 }),
    ]
  }
  return [startOfWeek(anchor, { weekStartsOn: 1 }), endOfWeek(anchor, { weekStartsOn: 1 })]
}

function rangeKey(view: ViewType, anchor: Date): string {
  return `${view}:${format(anchor, 'yyyy-MM-dd')}`
}

function periodLabel(view: ViewType, anchor: Date): string {
  if (view === 'day') return format(anchor, 'd MMMM yyyy', { locale: pl })
  if (view === 'month') return format(anchor, 'LLLL yyyy', { locale: pl })
  const from = startOfWeek(anchor, { weekStartsOn: 1 })
  const to = endOfWeek(anchor, { weekStartsOn: 1 })
  return `${format(from, 'd MMMM', { locale: pl })} – ${format(to, 'd MMMM yyyy', { locale: pl })}`
}

export function CalendarView({
  initialAppointments,
  initialTimeBlocks,
  treatments,
  salonId,
  initialDate,
  initialView = 'week',
  initialStaffFilter = 'all',
  initialError = null,
  staff,
}: CalendarViewProps) {
  const navigate = useNavigate()
  const search = useSearch({ strict: false }) as { view?: string }
  const [appointments, setAppointments] = useState<CalendarAppointment[]>(initialAppointments)
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>(initialTimeBlocks)
  const [view, setView] = useState<ViewType>(initialView)
  const [anchor, setAnchor] = useState<Date>(() => parseISO(initialDate))
  const [staffFilter, setStaffFilter] = useState<string>(() =>
    staff.some((member) => member.id === initialStaffFilter) ? initialStaffFilter : 'all',
  )
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(initialError)
  const [liveMessage, setLiveMessage] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [snapMinutes, setSnapMinutes] = useState(15)
  const [isBlockMode, setIsBlockMode] = useState(false)
  const [dragGuideMinutes, setDragGuideMinutes] = useState<number | null>(null)

  const requestIdRef = useRef(0)
  const lastAppliedKeyRef = useRef<string | null>(null)

  const [createSheet, setCreateSheet] = useState<{
    date: Date
    hour: number
    minute: number
    durationMinutes?: number
    staffId?: string | null
  } | null>(null)

  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    date: Date
    hour: number
    minute: number
    durationMinutes?: number
    staffId?: string | null
  } | null>(null)

  const [reserveSheet, setReserveSheet] = useState<{
    date: Date
    hour: number
    minute: number
    durationMinutes: number
    staffId?: string | null
  } | null>(null)

  const activeAppointment = activeId
    ? (appointments.find((appointment) => appointment.id === activeId) ?? null)
    : null

  const weekStart = startOfWeek(anchor, { weekStartsOn: 1 })
  const monthStart = startOfMonth(anchor)
  const showStaffColumns = view === 'day' && staff.length > 1

  // PointerSensor obsługuje i mysz, i dotyk (distance: 8) — przy touch-none
  // na bloku wizyty przeciąganie działa palcem, a nie przewija siatki.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  // ── Data loading ─────────────────────────────────────────────────────────────

  const loadRange = useCallback(
    async (nextView: ViewType, nextAnchor: Date) => {
      const key = rangeKey(nextView, nextAnchor)
      lastAppliedKeyRef.current = key
      const requestId = ++requestIdRef.current
      const [from, to] = rangeForView(nextView, nextAnchor)

      setIsLoading(true)
      setLoadError(null)

      try {
        const [appointmentsRes, freshBlocks] = await Promise.all([
          getCalendarAppointmentsFn({
            data: { salonId, from: from.toISOString(), to: to.toISOString() },
          }),
          getTimeBlocks(salonId, from, to),
        ])
        if (requestId !== requestIdRef.current) return
        if (appointmentsRes.error) throw new Error(appointmentsRes.error)
        setAppointments(appointmentsRes.appointments)
        setTimeBlocks(freshBlocks)
      } catch {
        if (requestId !== requestIdRef.current) return
        const message = 'Nie udało się załadować wizyt'
        setLoadError(message)
        toast.error(message, {
          action: {
            label: 'Spróbuj ponownie',
            onClick: () => {
              void loadRange(nextView, nextAnchor)
            },
          },
        })
      } finally {
        if (requestId === requestIdRef.current) setIsLoading(false)
      }
    },
    [salonId],
  )

  // Adopt loader data on external navigation (back/forward, deep link)
  const loaderKey = `${initialView}:${format(parseISO(initialDate), 'yyyy-MM-dd')}`
  useEffect(() => {
    if (loaderKey === lastAppliedKeyRef.current) return
    lastAppliedKeyRef.current = loaderKey
    setView(initialView)
    setAnchor(parseISO(initialDate))
    setStaffFilter(
      staff.some((member) => member.id === initialStaffFilter) ? initialStaffFilter : 'all',
    )
    setAppointments(initialAppointments)
    setTimeBlocks(initialTimeBlocks)
    setLoadError(initialError ?? null)
  }, [
    loaderKey,
    initialView,
    initialDate,
    initialStaffFilter,
    initialError,
    initialAppointments,
    initialTimeBlocks,
    staff,
  ])

  // ── Navigation ───────────────────────────────────────────────────────────────

  const syncUrl = useCallback(
    (nextView: ViewType, nextAnchor: Date, nextStaff: string) => {
      navigate({
        to: '/dashboard/calendar',
        search: {
          date: format(nextAnchor, 'yyyy-MM-dd'),
          view: nextView,
          staff: nextStaff === 'all' ? undefined : nextStaff,
        },
        replace: true,
      })
    },
    [navigate],
  )

  const goTo = useCallback(
    (nextView: ViewType, nextAnchor: Date) => {
      setView(nextView)
      setAnchor(nextAnchor)
      setLiveMessage(`Widok: ${periodLabel(nextView, nextAnchor)}`)
      syncUrl(nextView, nextAnchor, staffFilter)
      void loadRange(nextView, nextAnchor)
    },
    [staffFilter, syncUrl, loadRange],
  )

  const handleNavigate = useCallback(
    (direction: 'prev' | 'next' | 'today') => {
      let nextAnchor = anchor
      if (direction === 'today') nextAnchor = new Date()
      else if (view === 'day') nextAnchor = addDays(anchor, direction === 'prev' ? -1 : 1)
      else if (view === 'week')
        nextAnchor = direction === 'prev' ? subWeeks(anchor, 1) : addWeeks(anchor, 1)
      else nextAnchor = direction === 'prev' ? subMonths(anchor, 1) : addMonths(anchor, 1)
      goTo(view, nextAnchor)
    },
    [anchor, view, goTo],
  )

  const handleViewChange = useCallback(
    (nextView: ViewType) => {
      if (nextView === view) return
      goTo(nextView, anchor)
    },
    [view, anchor, goTo],
  )

  const handleDayClick = useCallback(
    (day: Date) => {
      goTo('day', day)
    },
    [goTo],
  )

  const handleStaffFilterChange = useCallback(
    (nextStaff: string) => {
      setStaffFilter(nextStaff)
      const name = staff.find((member) => member.id === nextStaff)?.name
      setLiveMessage(nextStaff === 'all' ? 'Filtr: wszyscy pracownicy' : `Filtr: ${name ?? ''}`)
      syncUrl(view, anchor, nextStaff)
    },
    [staff, view, anchor, syncUrl],
  )

  // On phones default to the day view unless the URL explicitly set `view`
  const mobileDefaultAppliedRef = useRef(false)
  useEffect(() => {
    if (mobileDefaultAppliedRef.current) return
    mobileDefaultAppliedRef.current = true
    if (search.view || initialView !== 'week') return
    if (!window.matchMedia('(max-width: 767px)').matches) return
    setView('day')
    setLiveMessage(`Widok: ${periodLabel('day', anchor)}`)
    syncUrl('day', anchor, staffFilter)
    void loadRange('day', anchor)
  }, [search.view, initialView, anchor, staffFilter, syncUrl, loadRange])

  // ── Mutations ────────────────────────────────────────────────────────────────

  const handleAppointmentUpdate = useCallback(
    async (id: string, changes: AppointmentUpdateChanges) => {
      const result = await updateAppointmentFn({ data: { id, ...changes } })
      if ('error' in result && result.error) {
        return { error: result.error }
      }
      setAppointments((prev) =>
        prev.map((appointment) => {
          if (appointment.id !== id) return appointment
          const nextStaff =
            changes.staff_id !== undefined
              ? (staff.find((member) => member.id === changes.staff_id) ?? null)
              : appointment.staff_member
          return {
            ...appointment,
            ...changes,
            staff_member: nextStaff ? { id: nextStaff.id, name: nextStaff.name } : null,
          }
        }),
      )
      setLiveMessage(
        `Zaktualizowano termin wizyty ${changes.start_time ? `na ${format(parseISO(changes.start_time), 'd MMMM, HH:mm', { locale: pl })}` : ''}`,
      )
      return { error: null }
    },
    [staff],
  )

  const handleDelete = useCallback(
    async (appointmentId: string) => {
      const removed = appointments.find((appointment) => appointment.id === appointmentId)
      setAppointments((prev) => prev.filter((appointment) => appointment.id !== appointmentId))
      const { error } = await deleteCalendarAppointment(appointmentId)
      if (error) {
        toast.error('Nie udało się usunąć wizyty')
        void loadRange(view, anchor)
        return
      }
      toast.success('Wizyta usunięta')
      setLiveMessage(`Usunięto wizytę ${removed?.client.name ?? ''}`)
    },
    [appointments, loadRange, view, anchor],
  )

  const handleStatusChange = useCallback(
    async (appointmentId: string, status: CalendarAppointment['status']) => {
      const previous = appointments.find((appointment) => appointment.id === appointmentId)?.status
      setAppointments((prev) =>
        prev.map((appointment) =>
          appointment.id === appointmentId ? { ...appointment, status } : appointment,
        ),
      )
      const { error } = await updateCalendarAppointmentStatus(appointmentId, status)
      if (error) {
        toast.error('Nie udało się zmienić statusu')
        setAppointments((prev) =>
          prev.map((appointment) =>
            appointment.id === appointmentId && previous
              ? { ...appointment, status: previous }
              : appointment,
          ),
        )
        return
      }
      setLiveMessage('Zmieniono status wizyty')
    },
    [appointments],
  )

  // ── Drag to move / reassign ──────────────────────────────────────────────────

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragMove = useCallback(
    (event: DragMoveEvent) => {
      const appointment = appointments.find((a) => a.id === event.active.id)
      if (!appointment) return
      const origStart = parseISO(appointment.start_time)
      const origMins = getHours(origStart) * 60 + getMinutes(origStart)
      const deltaMins = event.delta.y / PIXELS_PER_MINUTE
      const gridMins = origMins + deltaMins - START_HOUR * 60
      setDragGuideMinutes(Math.max(0, gridMins))
    },
    [appointments],
  )

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, delta, over } = event
      setActiveId(null)
      setDragGuideMinutes(null)

      if (!over) return
      const appointmentId = active.id as string
      const appointment = appointments.find((a) => a.id === appointmentId)
      if (!appointment) return

      const targetDate = over.data.current?.date as Date | undefined
      if (!targetDate) return

      const hasStaffTarget = over.data.current != null && 'staffId' in over.data.current
      const targetStaffId = hasStaffTarget
        ? ((over.data.current?.staffId as string | null) ?? null)
        : appointment.staff_id

      const originalStart = parseISO(appointment.start_time)
      const originalMins = getHours(originalStart) * 60 + getMinutes(originalStart)
      const deltaMins = Math.round(delta.y / PIXELS_PER_MINUTE / snapMinutes) * snapMinutes
      const newTotalMins = originalMins + deltaMins

      const clamped = Math.max(
        START_HOUR * 60,
        Math.min(END_HOUR * 60 - appointment.duration_minutes, newTotalMins),
      )
      const newStart = setMinutes(
        setHours(startOfDay(targetDate), Math.floor(clamped / 60)),
        clamped % 60,
      )
      const newStartISO = newStart.toISOString()
      const staffChanged = targetStaffId !== appointment.staff_id

      if (newStartISO === appointment.start_time && !staffChanged) return

      const conflicts = findConflicts({
        candidate: {
          start: newStart,
          end: addMinutes(newStart, appointment.duration_minutes),
          staffId: targetStaffId,
        },
        appointments: appointments.map((item) => ({
          id: item.id,
          start_time: item.start_time,
          duration_minutes: item.duration_minutes,
          staff_id: item.staff_id,
        })),
        excludeId: appointment.id,
      })

      if (conflicts.length > 0) {
        const busy = appointments.find((item) => item.id === conflicts[0])
        const busyStaffName = busy?.staff_member?.name
        toast.error(
          busyStaffName
            ? `Pracownik ${busyStaffName} ma już wizytę w tym czasie`
            : 'Ten termin koliduje z inną wizytą',
        )
        return
      }

      const previous = {
        start_time: appointment.start_time,
        staff_id: appointment.staff_id,
        staff_member: appointment.staff_member,
      }
      const nextStaff = targetStaffId
        ? (staff.find((member) => member.id === targetStaffId) ?? null)
        : null

      setAppointments((prev) =>
        prev.map((item) =>
          item.id === appointmentId
            ? {
                ...item,
                start_time: newStartISO,
                staff_id: targetStaffId,
                staff_member: nextStaff ? { id: nextStaff.id, name: nextStaff.name } : null,
              }
            : item,
        ),
      )

      const { error } = await updateAppointmentTiming(
        appointmentId,
        newStartISO,
        undefined,
        targetStaffId,
      )
      if (error) {
        toast.error(error)
        setAppointments((prev) =>
          prev.map((item) => (item.id === appointmentId ? { ...item, ...previous } : item)),
        )
        return
      }
      setLiveMessage(
        `Przeniesiono wizytę ${appointment.client.name} na ${format(newStart, 'd MMMM, HH:mm', { locale: pl })}${nextStaff ? `, ${nextStaff.name}` : ''}`,
      )
    },
    [appointments, snapMinutes, staff],
  )

  // ── Resize ───────────────────────────────────────────────────────────────────

  const handleResizeBottomStart = useCallback(
    (appointmentId: string, e: React.PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const appointment = appointments.find((a) => a.id === appointmentId)
      if (!appointment) return

      const startY = e.clientY
      const origDuration = appointment.duration_minutes
      let currentDuration = origDuration

      const onMove = (ev: PointerEvent) => {
        const dy = ev.clientY - startY
        const dMin = Math.round(dy / PIXELS_PER_MINUTE / snapMinutes) * snapMinutes
        currentDuration = Math.max(snapMinutes, origDuration + dMin)
        setAppointments((prev) =>
          prev.map((item) =>
            item.id === appointmentId ? { ...item, duration_minutes: currentDuration } : item,
          ),
        )
      }

      const onUp = async () => {
        document.removeEventListener('pointermove', onMove)
        const { error } = await updateAppointmentTiming(appointmentId, undefined, currentDuration)
        if (error) {
          toast.error(error)
          setAppointments((prev) =>
            prev.map((item) =>
              item.id === appointmentId ? { ...item, duration_minutes: origDuration } : item,
            ),
          )
        }
      }

      document.addEventListener('pointermove', onMove)
      document.addEventListener('pointerup', onUp, { once: true })
    },
    [appointments, snapMinutes],
  )

  const handleResizeTopStart = useCallback(
    (appointmentId: string, e: React.PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const appointment = appointments.find((a) => a.id === appointmentId)
      if (!appointment) return

      const startY = e.clientY
      const origStart = parseISO(appointment.start_time)
      const origDuration = appointment.duration_minutes
      let currentNewStart = origStart
      let currentNewDuration = origDuration

      const origStartMins = getHours(origStart) * 60 + getMinutes(origStart)

      const onMove = (ev: PointerEvent) => {
        const dy = ev.clientY - startY
        const dMin = Math.round(dy / PIXELS_PER_MINUTE / snapMinutes) * snapMinutes
        const maxDelta = origDuration - snapMinutes
        const minDelta = START_HOUR * 60 - origStartMins
        const clampedDelta = Math.max(minDelta, Math.min(maxDelta, dMin))
        currentNewStart = addMinutes(origStart, clampedDelta)
        currentNewDuration = origDuration - clampedDelta
        setAppointments((prev) =>
          prev.map((item) =>
            item.id === appointmentId
              ? {
                  ...item,
                  start_time: currentNewStart.toISOString(),
                  duration_minutes: currentNewDuration,
                }
              : item,
          ),
        )
      }

      const onUp = async () => {
        document.removeEventListener('pointermove', onMove)
        const { error } = await updateAppointmentTiming(
          appointmentId,
          currentNewStart.toISOString(),
          currentNewDuration,
        )
        if (error) {
          toast.error(error)
          setAppointments((prev) =>
            prev.map((item) =>
              item.id === appointmentId
                ? {
                    ...item,
                    start_time: appointment.start_time,
                    duration_minutes: origDuration,
                  }
                : item,
            ),
          )
        }
      }

      document.addEventListener('pointermove', onMove)
      document.addEventListener('pointerup', onUp, { once: true })
    },
    [appointments, snapMinutes],
  )

  // ── Slot select → context menu ────────────────────────────────────────────────

  const handleSlotSelect = useCallback(
    (
      date: Date,
      hour: number,
      minute: number,
      durationMinutes: number | undefined,
      cursorX: number,
      cursorY: number,
      staffId?: string | null,
    ) => {
      setContextMenu({ x: cursorX, y: cursorY, date, hour, minute, durationMinutes, staffId })
    },
    [],
  )

  // ── Time block helpers ────────────────────────────────────────────────────────

  const refreshTimeBlocks = useCallback(async () => {
    const [from, to] = rangeForView(view, anchor)
    const fresh = await getTimeBlocks(salonId, from, to)
    setTimeBlocks(fresh)
  }, [view, anchor, salonId])

  const handleDeleteTimeBlock = useCallback(
    async (id: string) => {
      setTimeBlocks((prev) => prev.filter((block) => block.id !== id))
      const { error } = await deleteTimeBlock(id)
      if (error) {
        toast.error('Nie udało się usunąć rezerwacji')
        await refreshTimeBlocks()
      } else {
        toast.success('Rezerwacja usunięta')
        setLiveMessage('Usunięto rezerwację czasu')
      }
    },
    [refreshTimeBlocks],
  )

  // ── Context menu actions ──────────────────────────────────────────────────────

  const handleContextCreateAppointment = useCallback(() => {
    if (!contextMenu) return
    setCreateSheet({
      date: contextMenu.date,
      hour: contextMenu.hour,
      minute: contextMenu.minute,
      durationMinutes: contextMenu.durationMinutes,
      staffId: contextMenu.staffId,
    })
    setContextMenu(null)
  }, [contextMenu])

  const handleContextReserveTime = useCallback(() => {
    if (!contextMenu) return
    setReserveSheet({
      date: contextMenu.date,
      hour: contextMenu.hour,
      minute: contextMenu.minute,
      durationMinutes: contextMenu.durationMinutes ?? snapMinutes,
      staffId: contextMenu.staffId ?? null,
    })
    setContextMenu(null)
  }, [contextMenu, snapMinutes])

  const handleContextBlockInstant = useCallback(async () => {
    if (!contextMenu) return
    const { date, hour, minute, durationMinutes = snapMinutes, staffId } = contextMenu
    setContextMenu(null)
    const dateStr = format(date, 'yyyy-MM-dd')
    const start = new Date(
      `${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`,
    )
    const end = addMinutes(start, durationMinutes)
    const { error } = await createTimeBlock({
      salonId,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      staffId: staffId ?? null,
    })
    if (error) {
      console.error('[time_blocks] createTimeBlock error:', error)
      toast.error(`Nie udało się zarezerwować czasu: ${error}`)
    } else {
      await refreshTimeBlocks()
      toast.success('Czas zablokowany')
    }
  }, [contextMenu, snapMinutes, salonId, refreshTimeBlocks])

  const handleDrawGuide = useCallback((minutes: number | null) => {
    setDragGuideMinutes(minutes)
  }, [])

  const handleNewAppointment = useCallback(() => {
    const now = new Date()
    const base = isSameDay(anchor, now) ? now : setMinutes(setHours(anchor, 9), 0)
    const remainder = getMinutes(base) % 15
    const next = remainder === 0 ? base : addMinutes(base, 15 - remainder)
    setCreateSheet({
      date: anchor,
      hour: getHours(next),
      minute: getMinutes(next),
      staffId: staffFilter === 'all' ? null : staffFilter,
    })
  }, [anchor, staffFilter])

  // ── Appointment created ───────────────────────────────────────────────────────

  const handleAppointmentCreated = useCallback(async () => {
    await loadRange(view, anchor)
    toast.success('Wizyta dodana')
  }, [loadRange, view, anchor])

  // ── Render ────────────────────────────────────────────────────────────────────

  const daysForGrid = view === 'day' ? [anchor] : undefined

  const pendingSelection: PendingSelection | null =
    contextMenu && !showStaffColumns
      ? {
          date: contextMenu.date,
          hour: contextMenu.hour,
          minute: contextMenu.minute,
          durationMinutes: contextMenu.durationMinutes ?? snapMinutes,
        }
      : null

  const staffPendingSelection =
    contextMenu && showStaffColumns
      ? {
          date: contextMenu.date,
          hour: contextMenu.hour,
          minute: contextMenu.minute,
          durationMinutes: contextMenu.durationMinutes ?? snapMinutes,
          staffId: contextMenu.staffId ?? null,
        }
      : null

  const staffScope: Pick<StaffMember, 'id' | 'name'>[] =
    staffFilter === 'all' ? staff : staff.filter((member) => member.id === staffFilter)

  const scopedAppointments =
    staffFilter === 'all'
      ? appointments
      : appointments.filter((appointment) => appointment.staff_id === staffFilter)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <CalendarHeader
        weekStart={weekStart}
        selectedDay={anchor}
        monthStart={monthStart}
        view={view}
        isLoading={isLoading}
        snapMinutes={snapMinutes}
        isBlockMode={isBlockMode}
        staff={staff}
        staffFilter={staffFilter}
        onStaffFilterChange={handleStaffFilterChange}
        onNewAppointment={handleNewAppointment}
        onNavigate={handleNavigate}
        onSnapChange={setSnapMinutes}
        onBlockModeChange={setIsBlockMode}
        onViewChange={handleViewChange}
      />

      {view === 'week' && staff.length > 0 && <StaffLegend staff={staff} />}

      <div aria-live="polite" role="status" className="sr-only">
        {liveMessage}
      </div>

      {loadError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 px-4 py-2 border-b border-destructive/30 bg-destructive/10 text-sm text-destructive shrink-0"
        >
          <span>{loadError}</span>
          <button
            type="button"
            onClick={() => void loadRange(view, anchor)}
            className="px-3 py-1.5 rounded-lg border border-destructive/40 font-medium hover:bg-destructive/10 transition-colors min-h-[32px]"
          >
            Spróbuj ponownie
          </button>
        </div>
      )}

      <div className="relative flex flex-1 min-h-0 flex-col overflow-hidden" aria-busy={isLoading}>
        {isLoading && appointments.length === 0 && (
          <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden bg-background">
            <CalendarSkeleton
              variant={view === 'month' ? 'month' : 'grid'}
              columnCount={showStaffColumns ? staff.length + 1 : view === 'week' ? 7 : 1}
            />
          </div>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          modifiers={[restrictToWindowEdges]}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
        >
          {view === 'month' ? (
            <CalendarMonthView
              monthStart={monthStart}
              appointments={scopedAppointments}
              onDayClick={handleDayClick}
              staffMembers={staffScope}
              onUpdateAppointment={handleAppointmentUpdate}
              onStatusChange={handleStatusChange}
            />
          ) : showStaffColumns ? (
            <CalendarStaffGrid
              selectedDay={anchor}
              staff={staff}
              staffFilter={staffFilter}
              appointments={appointments}
              timeBlocks={timeBlocks}
              snapMinutes={snapMinutes}
              isBlockMode={isBlockMode}
              dragGuideMinutes={dragGuideMinutes}
              pendingSelection={staffPendingSelection}
              onSlotSelect={handleSlotSelect}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
              onResizeBottomStart={handleResizeBottomStart}
              onResizeTopStart={handleResizeTopStart}
              onDeleteTimeBlock={handleDeleteTimeBlock}
              onDrawGuide={handleDrawGuide}
              onUpdateAppointment={handleAppointmentUpdate}
            />
          ) : (
            <CalendarGrid
              weekStart={weekStart}
              days={daysForGrid}
              appointments={scopedAppointments}
              timeBlocks={timeBlocks}
              snapMinutes={snapMinutes}
              isBlockMode={isBlockMode}
              dragGuideMinutes={dragGuideMinutes}
              pendingSelection={pendingSelection}
              staffMembers={staffScope}
              onSlotSelect={handleSlotSelect}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
              onResizeBottomStart={handleResizeBottomStart}
              onResizeTopStart={handleResizeTopStart}
              onDeleteTimeBlock={handleDeleteTimeBlock}
              onDrawGuide={handleDrawGuide}
              onUpdateAppointment={handleAppointmentUpdate}
            />
          )}

          <DragOverlay dropAnimation={null}>
            {activeAppointment ? (
              <AppointmentDragOverlay
                appointment={activeAppointment}
                height={activeAppointment.duration_minutes * PIXELS_PER_MINUTE}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {contextMenu && (
        <SlotContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          isBlockMode={isBlockMode}
          onCreateAppointment={handleContextCreateAppointment}
          onReserveTime={handleContextReserveTime}
          onBlockInstant={handleContextBlockInstant}
          onClose={() => setContextMenu(null)}
        />
      )}

      {createSheet && (
        <CreateAppointmentSheet
          open
          onOpenChange={(open) => !open && setCreateSheet(null)}
          defaultDate={createSheet.date}
          defaultHour={createSheet.hour}
          defaultMinute={createSheet.minute}
          defaultDurationMinutes={createSheet.durationMinutes}
          defaultStaffId={createSheet.staffId}
          treatments={treatments}
          staffMembers={staff}
          salonId={salonId}
          timeBlocks={timeBlocks}
          onCreated={handleAppointmentCreated}
        />
      )}

      {reserveSheet && (
        <ReserveTimeSheet
          open
          onOpenChange={(open) => !open && setReserveSheet(null)}
          date={reserveSheet.date}
          hour={reserveSheet.hour}
          minute={reserveSheet.minute}
          durationMinutes={reserveSheet.durationMinutes}
          salonId={salonId}
          staffMembers={staff}
          defaultStaffId={reserveSheet.staffId ?? null}
          onCreated={async () => {
            await refreshTimeBlocks()
          }}
        />
      )}
    </div>
  )
}
