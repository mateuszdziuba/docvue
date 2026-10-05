import { createFileRoute, useRouterState } from '@tanstack/react-router'
import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  isValid,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { z } from 'zod'
import { CalendarSkeleton } from '@/components/admin/calendar/calendar-skeleton'
import { CalendarView } from '@/components/admin/calendar/calendar-view'
import { getCalendarAppointmentsFn } from '@/src/server/appointments'
import { getSalonFn } from '@/src/server/settings'
import { getStaffFn } from '@/src/server/staff'
import { getTimeBlocksFn } from '@/src/server/time-blocks'
import { getTreatmentsFn } from '@/src/server/treatments'

const searchSchema = z.object({
  date: z.string().optional(),
  view: z.enum(['day', 'week', 'month']).optional(),
  staff: z.string().optional(),
  week: z.string().optional(),
})

type CalendarSearch = z.infer<typeof searchSchema>

function rangeForView(view: 'day' | 'week' | 'month', anchor: Date): [Date, Date] {
  if (view === 'day') return [startOfDay(anchor), endOfDay(anchor)]
  if (view === 'month') {
    return [
      startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 }),
      endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 }),
    ]
  }
  return [startOfWeek(anchor, { weekStartsOn: 1 }), endOfWeek(anchor, { weekStartsOn: 1 })]
}

function CalendarPending() {
  const view = useRouterState({
    select: (state) => (state.location.search as { view?: string } | undefined)?.view ?? 'week',
  })
  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <CalendarSkeleton
        variant={view === 'month' ? 'month' : 'grid'}
        columnCount={view === 'week' ? 7 : 5}
      />
    </div>
  )
}

export const Route = createFileRoute('/_authed/dashboard/calendar/')({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search) as CalendarSearch,
  pendingComponent: CalendarPending,
  loaderDeps: ({ search }): CalendarSearch => ({
    date: search.date,
    view: search.view,
    staff: search.staff,
    week: search.week,
  }),
  loader: async ({ deps }) => {
    const raw = deps.date ?? deps.week
    let anchor = new Date()
    if (raw) {
      const parsed = parseISO(raw)
      if (isValid(parsed)) anchor = parsed
    }
    const view = deps.view ?? 'week'
    const [from, to] = rangeForView(view, anchor)

    const salon = await getSalonFn()
    const salonId = salon?.id ?? ''

    const [appointmentsRes, treatmentsRes, timeBlocksRes, staffRes] = await Promise.all([
      getCalendarAppointmentsFn({
        data: { salonId, from: from.toISOString(), to: to.toISOString() },
      }),
      getTreatmentsFn({ data: {} }),
      getTimeBlocksFn({
        data: { salonId, from: from.toISOString(), to: to.toISOString() },
      }),
      getStaffFn(),
    ])

    const staff = (staffRes.data ?? []).filter((member) => member.is_active)

    return {
      appointments: appointmentsRes.appointments,
      error: appointmentsRes.error,
      treatments: treatmentsRes.treatments,
      timeBlocks: timeBlocksRes.timeBlocks,
      salon,
      staff,
      initialDate: anchor.toISOString(),
      initialView: view,
      initialStaffFilter: deps.staff ?? 'all',
    }
  },
  component: CalendarPage,
})

function CalendarPage() {
  const data = Route.useLoaderData()

  return (
    <div className="h-full flex flex-col">
      <CalendarView
        initialAppointments={data.appointments ?? []}
        treatments={data.treatments ?? []}
        initialTimeBlocks={data.timeBlocks ?? []}
        salonId={data.salon?.id ?? ''}
        initialDate={data.initialDate}
        initialView={data.initialView}
        initialStaffFilter={data.initialStaffFilter}
        initialError={data.error}
        staff={data.staff ?? []}
      />
    </div>
  )
}
