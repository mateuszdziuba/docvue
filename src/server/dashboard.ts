import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '../utils/supabase'
import { getCallerSalonId } from './_salon-resolver'

export const getDashboardStatsFn = createServerFn({ method: 'GET' }).handler(async () => {
  const supabase = getSupabaseServerClient()
  const caller = await getCallerSalonId(supabase)
  if (!caller) return null

  const salonId = caller.salonId
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  // Wszystkie zapytania równolegle — jedno opóźnienie sieciowe zamiast pięciu.
  const [
    { count: formsCount },
    { count: clientsCount },
    { count: appointmentsCount },
    { count: submissionsCount },
    { data: recentSubmissions },
    { data: upcomingAppointments },
    { data: weeklySubmissions },
  ] = await Promise.all([
    supabase.from('forms').select('*', { count: 'exact', head: true }).eq('salon_id', salonId),
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('salon_id', salonId),
    supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('salon_id', salonId),
    supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('salon_id', salonId),
    supabase
      .from('submissions')
      .select('id, client_name, created_at, forms (id, title)')
      .eq('salon_id', salonId)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('appointments')
      .select('id, start_time, status, clients (id, name), treatments (id, name)')
      .eq('salon_id', salonId)
      .gte('start_time', new Date().toISOString())
      .in('status', ['scheduled', 'pending_forms'])
      .order('start_time', { ascending: true })
      .limit(5),
    supabase
      .from('submissions')
      .select('created_at')
      .eq('salon_id', salonId)
      .gte('created_at', sevenDaysAgo.toISOString()),
  ])

  const chartData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - i))
    const dateStr = date.toISOString().split('T')[0]
    const count = (weeklySubmissions || []).filter(
      (s) => s.created_at.startsWith(dateStr)
    ).length
    return { day: dateStr.slice(5), wizyty: 0, odpowiedzi: count }
  })

  return {
    formsCount: formsCount ?? 0,
    clientsCount: clientsCount ?? 0,
    appointmentsCount: appointmentsCount ?? 0,
    submissionsCount: submissionsCount ?? 0,
    recentSubmissions: recentSubmissions || [],
    upcomingAppointments: upcomingAppointments || [],
    chartData,
  }
})
