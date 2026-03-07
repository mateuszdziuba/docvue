import { redirect } from 'next/navigation'
import { startOfWeek, endOfWeek, parseISO, isValid } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import { getCalendarAppointments } from '@/actions/appointments'
import { getTimeBlocks } from '@/actions/time-blocks'
import { CalendarView } from '@/components/admin/calendar/calendar-view'

export const dynamic = 'force-dynamic'

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: salon } = await supabase
    .from('salons')
    .select('id, name')
    .eq('user_id', user.id)
    .single()

  const params = await searchParams
  let weekDate = new Date()
  if (params.week) {
    const parsed = parseISO(params.week)
    if (isValid(parsed)) weekDate = parsed
  }

  const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(weekDate, { weekStartsOn: 1 })

  const [appointments, treatmentsResult, timeBlocks] = await Promise.all([
    getCalendarAppointments(salon?.id ?? '', weekStart, weekEnd),
    supabase
      .from('treatments')
      .select('id, name, duration_minutes, price')
      .eq('salon_id', salon?.id ?? '')
      .order('name'),
    getTimeBlocks(salon?.id ?? '', weekStart, weekEnd),
  ])

  const treatments = treatmentsResult.data ?? []

  return (
    <div className="h-full flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
      <CalendarView
        initialAppointments={appointments}
        initialTimeBlocks={timeBlocks}
        treatments={treatments}
        salonId={salon?.id ?? ''}
        initialWeekStart={weekStart.toISOString()}
      />
    </div>
  )
}
