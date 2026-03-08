'use client'

import { useCallback, useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragMoveEvent,
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
  endOfDay,
  addDays,
  setHours,
  setMinutes,
  addMinutes,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  format,
} from 'date-fns'
import { toast } from 'sonner'
import { CalendarHeader, type ViewType } from './calendar-header'
import { CalendarGrid, type PendingSelection } from './calendar-grid'
import { CalendarMonthView } from './calendar-month-view'
import { SlotContextMenu } from './slot-context-menu'
import { ReserveTimeSheet } from './reserve-time-sheet'
import { AppointmentDragOverlay } from './calendar-appointment'
import { CreateAppointmentSheet } from './create-appointment-sheet'
import {
  getCalendarAppointments,
  updateAppointmentTiming,
  updateCalendarAppointmentStatus,
  deleteCalendarAppointment,
  type CalendarAppointment,
} from '@/actions/appointments'
import {
  getTimeBlocks,
  createTimeBlock,
  deleteTimeBlock,
  type TimeBlock,
} from '@/actions/time-blocks'
import { PIXELS_PER_MINUTE, START_HOUR, END_HOUR } from './constants'
import type { Treatment } from '@/types/database'

interface CalendarViewProps {
  initialAppointments: CalendarAppointment[]
  initialTimeBlocks: TimeBlock[]
  treatments: Pick<Treatment, 'id' | 'name' | 'duration_minutes' | 'price'>[]
  salonId: string
  initialWeekStart: string
}

export function CalendarView({
  initialAppointments,
  initialTimeBlocks,
  treatments,
  salonId,
  initialWeekStart,
}: CalendarViewProps) {
  const [appointments, setAppointments] = useState<CalendarAppointment[]>(initialAppointments)
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>(initialTimeBlocks)
  const [weekStart, setWeekStart] = useState<Date>(() => parseISO(initialWeekStart))
  const [selectedDay, setSelectedDay] = useState<Date>(new Date())
  const [monthStart, setMonthStart] = useState<Date>(() => startOfMonth(parseISO(initialWeekStart)))
  const [view, setView] = useState<ViewType>('week')
  const [isLoading, setIsLoading] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [snapMinutes, setSnapMinutes] = useState(15)
  const [isBlockMode, setIsBlockMode] = useState(false)
  const [dragGuideMinutes, setDragGuideMinutes] = useState<number | null>(null)

  const [createSheet, setCreateSheet] = useState<{
    date: Date
    hour: number
    minute: number
    durationMinutes?: number
  } | null>(null)

  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    date: Date
    hour: number
    minute: number
    durationMinutes?: number
  } | null>(null)

  const [reserveSheet, setReserveSheet] = useState<{
    date: Date
    hour: number
    minute: number
    durationMinutes: number
  } | null>(null)

  const activeAppointment = activeId
    ? (appointments.find((a) => a.id === activeId) ?? null)
    : null

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  // ── Date range helpers ───────────────────────────────────────────────────────

  const getRangeForView = (v: ViewType, wStart: Date, sDay: Date, mStart: Date): [Date, Date] => {
    if (v === 'day') return [startOfDay(sDay), endOfDay(sDay)]
    if (v === 'month') {
      return [
        startOfWeek(startOfMonth(mStart), { weekStartsOn: 1 }),
        endOfWeek(endOfMonth(mStart), { weekStartsOn: 1 }),
      ]
    }
    return [wStart, endOfWeek(wStart, { weekStartsOn: 1 })]
  }

  // ── Navigation ───────────────────────────────────────────────────────────────

  const navigate = useCallback(
    async (direction: 'prev' | 'next' | 'today') => {
      let newWeekStart = weekStart
      let newSelectedDay = selectedDay
      let newMonthStart = monthStart

      if (direction === 'today') {
        const now = new Date()
        newWeekStart = startOfWeek(now, { weekStartsOn: 1 })
        newSelectedDay = now
        newMonthStart = startOfMonth(now)
      } else if (view === 'day') {
        newSelectedDay = addDays(selectedDay, direction === 'prev' ? -1 : 1)
        newWeekStart = startOfWeek(newSelectedDay, { weekStartsOn: 1 })
        newMonthStart = startOfMonth(newSelectedDay)
      } else if (view === 'week') {
        newWeekStart = direction === 'prev' ? subWeeks(weekStart, 1) : addWeeks(weekStart, 1)
        newSelectedDay = newWeekStart
        newMonthStart = startOfMonth(newWeekStart)
      } else {
        newMonthStart = direction === 'prev' ? subMonths(monthStart, 1) : addMonths(monthStart, 1)
        newWeekStart = startOfWeek(newMonthStart, { weekStartsOn: 1 })
        newSelectedDay = newMonthStart
      }

      setWeekStart(newWeekStart)
      setSelectedDay(newSelectedDay)
      setMonthStart(newMonthStart)
      setIsLoading(true)

      const [from, to] = getRangeForView(view, newWeekStart, newSelectedDay, newMonthStart)
      const [fresh, freshBlocks] = await Promise.all([
        getCalendarAppointments(salonId, from, to),
        getTimeBlocks(salonId, from, to),
      ])
      setAppointments(fresh)
      setTimeBlocks(freshBlocks)
      setIsLoading(false)
    },
    [view, weekStart, selectedDay, monthStart, salonId],
  )

  const handleViewChange = useCallback(
    async (newView: ViewType) => {
      setView(newView)
      setIsLoading(true)
      const [from, to] = getRangeForView(newView, weekStart, selectedDay, monthStart)
      const [fresh, freshBlocks] = await Promise.all([
        getCalendarAppointments(salonId, from, to),
        getTimeBlocks(salonId, from, to),
      ])
      setAppointments(fresh)
      setTimeBlocks(freshBlocks)
      setIsLoading(false)
    },
    [weekStart, selectedDay, monthStart, salonId],
  )

  const handleDayClick = useCallback(
    async (day: Date) => {
      const newWeekStart = startOfWeek(day, { weekStartsOn: 1 })
      setView('day')
      setSelectedDay(day)
      setWeekStart(newWeekStart)
      setMonthStart(startOfMonth(day))
      setIsLoading(true)
      const from = startOfDay(day)
      const to = endOfDay(day)
      const [fresh, freshBlocks] = await Promise.all([
        getCalendarAppointments(salonId, from, to),
        getTimeBlocks(salonId, from, to),
      ])
      setAppointments(fresh)
      setTimeBlocks(freshBlocks)
      setIsLoading(false)
    },
    [salonId],
  )

  // ── Drag to move ─────────────────────────────────────────────────────────────

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragMove = useCallback(
    (event: DragMoveEvent) => {
      const apt = appointments.find((a) => a.id === event.active.id)
      if (!apt) return
      const origStart = parseISO(apt.start_time)
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

      const originalStart = parseISO(appointment.start_time)
      const originalMins = getHours(originalStart) * 60 + getMinutes(originalStart)
      const deltaMins = Math.round((delta.y / PIXELS_PER_MINUTE) / snapMinutes) * snapMinutes
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

      if (newStartISO === appointment.start_time) return

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
    [appointments, snapMinutes],
  )

  // ── Drag bottom edge ──────────────────────────────────────────────────────────

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
        const dMin = Math.round((dy / PIXELS_PER_MINUTE) / snapMinutes) * snapMinutes
        curDuration = Math.max(snapMinutes, origDuration + dMin)
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
    [appointments, snapMinutes],
  )

  // ── Drag top edge ─────────────────────────────────────────────────────────────

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
        const dMin = Math.round((dy / PIXELS_PER_MINUTE) / snapMinutes) * snapMinutes
        const maxDelta = origDuration - snapMinutes
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
    [appointments, snapMinutes],
  )

  // ── Delete ────────────────────────────────────────────────────────────────────

  const handleDelete = useCallback(async (appointmentId: string) => {
    setAppointments((prev) => prev.filter((a) => a.id !== appointmentId))
    const { error } = await deleteCalendarAppointment(appointmentId)
    if (error) toast.error('Nie udało się usunąć wizyty')
    else toast.success('Wizyta usunięta')
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

  // ── Slot select → context menu ────────────────────────────────────────────────

  const handleSlotSelect = useCallback(
    (
      date: Date,
      hour: number,
      minute: number,
      durationMinutes: number | undefined,
      cursorX: number,
      cursorY: number,
    ) => {
      setContextMenu({ x: cursorX, y: cursorY, date, hour, minute, durationMinutes })
    },
    [],
  )

  // ── Time block helpers ────────────────────────────────────────────────────────

  const refreshTimeBlocks = useCallback(async () => {
    const [from, to] = getRangeForView(view, weekStart, selectedDay, monthStart)
    const fresh = await getTimeBlocks(salonId, from, to)
    setTimeBlocks(fresh)
  }, [view, weekStart, selectedDay, monthStart, salonId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDeleteTimeBlock = useCallback(
    async (id: string) => {
      setTimeBlocks((prev) => prev.filter((b) => b.id !== id))
      const { error } = await deleteTimeBlock(id)
      if (error) {
        toast.error('Nie udało się usunąć rezerwacji')
        await refreshTimeBlocks()
      } else {
        toast.success('Rezerwacja usunięta')
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
    })
    setContextMenu(null)
  }, [contextMenu, snapMinutes])

  const handleContextBlockInstant = useCallback(async () => {
    if (!contextMenu) return
    const { date, hour, minute, durationMinutes = snapMinutes } = contextMenu
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

  // ── Appointment created ───────────────────────────────────────────────────────

  const handleAppointmentCreated = useCallback(async () => {
    const [from, to] = getRangeForView(view, weekStart, selectedDay, monthStart)
    const fresh = await getCalendarAppointments(salonId, from, to)
    setAppointments(fresh)
    toast.success('Wizyta dodana')
  }, [view, weekStart, selectedDay, monthStart, salonId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Render ────────────────────────────────────────────────────────────────────

  const daysForGrid = view === 'day' ? [selectedDay] : undefined

  const pendingSelection: PendingSelection | null = contextMenu
    ? {
        date: contextMenu.date,
        hour: contextMenu.hour,
        minute: contextMenu.minute,
        durationMinutes: contextMenu.durationMinutes ?? snapMinutes,
      }
    : null

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <CalendarHeader
        weekStart={weekStart}
        selectedDay={selectedDay}
        monthStart={monthStart}
        view={view}
        isLoading={isLoading}
        snapMinutes={snapMinutes}
        isBlockMode={isBlockMode}
        onNavigate={navigate}
        onSnapChange={setSnapMinutes}
        onBlockModeChange={setIsBlockMode}
        onViewChange={handleViewChange}
      />

      {view === 'month' ? (
        <CalendarMonthView
          monthStart={monthStart}
          appointments={appointments}
          onDayClick={handleDayClick}
          onSlotSelect={handleSlotSelect}
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          modifiers={[restrictToWindowEdges]}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
        >
          <CalendarGrid
            weekStart={weekStart}
            days={daysForGrid}
            appointments={appointments}
            timeBlocks={timeBlocks}
            snapMinutes={snapMinutes}
            isBlockMode={isBlockMode}
            dragGuideMinutes={dragGuideMinutes}
            pendingSelection={pendingSelection}
            onSlotSelect={handleSlotSelect}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
            onResizeBottomStart={handleResizeBottomStart}
            onResizeTopStart={handleResizeTopStart}
            onDeleteTimeBlock={handleDeleteTimeBlock}
            onDrawGuide={handleDrawGuide}
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
      )}

      {/* Floating context menu */}
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

      {/* Create appointment sheet */}
      {createSheet && (
        <CreateAppointmentSheet
          open
          onOpenChange={(o) => !o && setCreateSheet(null)}
          defaultDate={createSheet.date}
          defaultHour={createSheet.hour}
          defaultMinute={createSheet.minute}
          defaultDurationMinutes={createSheet.durationMinutes}
          treatments={treatments}
          salonId={salonId}
          timeBlocks={timeBlocks}
          onCreated={handleAppointmentCreated}
        />
      )}

      {/* Reserve time sheet */}
      {reserveSheet && (
        <ReserveTimeSheet
          open
          onOpenChange={(o) => !o && setReserveSheet(null)}
          date={reserveSheet.date}
          hour={reserveSheet.hour}
          minute={reserveSheet.minute}
          durationMinutes={reserveSheet.durationMinutes}
          salonId={salonId}
          onCreated={async () => {
            await refreshTimeBlocks()
          }}
        />
      )}
    </div>
  )
}
