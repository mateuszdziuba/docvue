import { createFileRoute } from '@tanstack/react-router'
import { startOfWeek, endOfWeek, parseISO, isValid } from 'date-fns'
import { getCalendarAppointmentsFn } from '@/src/server/appointments'
import { getTimeBlocksFn } from '@/src/server/time-blocks'
import { getTreatmentsFn } from '@/src/server/treatments'
import { getClientsFn } from '@/src/server/clients'
import { getSalonFn } from '@/src/server/settings'
import { getStaffFn } from '@/src/server/staff'
import { CalendarView } from '@/components/admin/calendar/calendar-view'
import { z } from 'zod'

const searchSchema = z.object({
  week: z.string().optional(),
})

export const Route = createFileRoute('/_authed/dashboard/calendar/')({
  validateSearch: (search: Record<string, unknown>) =>
    searchSchema.parse(search),
  loaderDeps: ({ search }) => ({ week: search.week }),
  loader: async ({ deps }) => {
    let weekDate = new Date()
    if (deps.week) {
      const parsed = parseISO(deps.week)
      if (isValid(parsed)) weekDate = parsed
    }

    const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(weekDate, { weekStartsOn: 1 })

    const salonRes = await getSalonFn()
    const salonId = salonRes.salon?.id ?? ''

    const [appointmentsRes, treatmentsRes, timeBlocksRes, staffRes] = await Promise.all([
      getCalendarAppointmentsFn({
        data: {
          salonId,
          from: weekStart.toISOString(),
          to: weekEnd.toISOString(),
        },
      }),
      getTreatmentsFn({ data: {} }),
      getTimeBlocksFn({
        data: {
          salonId,
          from: weekStart.toISOString(),
          to: weekEnd.toISOString(),
        },
      }),
      getStaffFn(),
    ])

    return {
      appointments: appointmentsRes.appointments,
      treatments: treatmentsRes.treatments,
      timeBlocks: timeBlocksRes.timeBlocks,
      salon: salonRes.salon,
      staff: staffRes.data ?? [],
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
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
        initialWeekStart={data.weekStart}
        staff={data.staff ?? []}
      />
    </div>
  )
}
