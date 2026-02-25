import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { AddAppointmentDialog } from '@/components/admin/add-appointment-dialog'
import { syncMultipleAppointmentStatuses } from '@/actions/appointments-sync'
import { WeeklyChart } from '@/components/admin/weekly-chart'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: salon } = await supabase
    .from('salons')
    .select('*')
    .eq('user_id', user?.id)
    .single()

  // Get counts
  const [
    { count: formsCount },
    { count: clientsCount },
    { count: appointmentsCount },
    { count: submissionsCount },
  ] = await Promise.all([
    supabase.from('forms').select('*', { count: 'exact', head: true }).eq('salon_id', salon?.id),
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('salon_id', salon?.id),
    supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('salon_id', salon?.id),
    supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('salon_id', salon?.id),
  ])

  // Get recent submissions
  const { data: recentSubmissions } = await supabase
    .from('submissions')
    .select(`*, forms (title)`)
    .eq('salon_id', salon?.id)
    .order('created_at', { ascending: false })
    .limit(5)

  // Get upcoming appointments
  const now = new Date()
  const { data: upcomingAppointments } = await supabase
    .from('appointments')
    .select(`*, treatments (name, duration_minutes), clients (name)`)
    .eq('salon_id', salon?.id)
    .gte('start_time', now.toISOString())
    .order('start_time', { ascending: true })
    .limit(3)

  // Sync status
  if (upcomingAppointments && upcomingAppointments.length > 0) {
    const appointmentIds = upcomingAppointments.map(a => a.id)
    await syncMultipleAppointmentStatuses(appointmentIds)
    const { data: refreshed } = await supabase
      .from('appointments')
      .select(`*, treatments (name, duration_minutes), clients (name)`)
      .in('id', appointmentIds)
      .order('start_time', { ascending: true })
    if (refreshed) upcomingAppointments.splice(0, upcomingAppointments.length, ...refreshed)
  }

  // Build 7-day chart data
  const weekDays = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So']
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
  sevenDaysAgo.setHours(0, 0, 0, 0)

  const { data: weekAppointments } = await supabase
    .from('appointments')
    .select('start_time')
    .eq('salon_id', salon?.id)
    .gte('start_time', sevenDaysAgo.toISOString())

  const { data: weekSubmissions } = await supabase
    .from('submissions')
    .select('created_at')
    .eq('salon_id', salon?.id)
    .gte('created_at', sevenDaysAgo.toISOString())

  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sevenDaysAgo)
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    return {
      day: weekDays[d.getDay()],
      wizyty: weekAppointments?.filter(a => a.start_time.startsWith(dateStr)).length || 0,
      odpowiedzi: weekSubmissions?.filter(s => s.created_at.startsWith(dateStr)).length || 0,
    }
  })

  const stats = [
    { name: 'Klienci', value: clientsCount || 0, href: '/dashboard/clients',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
      color: 'primary' },
    { name: 'Wizyty', value: appointmentsCount || 0, href: '/dashboard/visits',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
      color: 'accent' },
    { name: 'Formularze', value: formsCount || 0, href: '/dashboard/forms',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
      color: 'blue' },
    { name: 'Odpowiedzi', value: submissionsCount || 0, href: '/dashboard/submissions',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
      color: 'green' },
  ]

  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    primary: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-l-primary' },
    accent: { bg: 'bg-accent/10', text: 'text-accent', border: 'border-l-accent' },
    blue: { bg: 'bg-[hsl(220,50%,50%)]/10', text: 'text-[hsl(220,50%,50%)]', border: 'border-l-[hsl(220,50%,50%)]' },
    green: { bg: 'bg-[hsl(150,45%,45%)]/10', text: 'text-[hsl(150,45%,45%)]', border: 'border-l-[hsl(150,45%,45%)]' },
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Witaj, {salon?.name || 'Gabinet'}
        </h1>
        <p className="mt-1 text-muted-foreground text-sm">Oto podsumowanie Twojego gabinetu</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat) => {
          const c = colorMap[stat.color]
          return (
            <Link
              key={stat.name}
              href={stat.href}
              className={`group bg-card rounded-xl p-5 border border-border/60 hover:border-border border-l-[3px] ${c.border} transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{stat.name}</p>
                  <p className="text-3xl font-bold text-foreground mt-1.5 tabular-nums">{stat.value}</p>
                </div>
                <div className={`p-2 rounded-lg ${c.bg} ${c.text}`}>
                  {stat.icon}
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Chart + Quick Actions Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Weekly Chart */}
        <div className="lg:col-span-3 bg-card rounded-xl p-5 border border-border/60">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Ostatnie 7 dni</h2>
            <div className="flex items-center gap-4 text-[10px] font-medium">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary" />Wizyty</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-accent" />Odpowiedzi</span>
            </div>
          </div>
          <WeeklyChart data={chartData} />
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-2 bg-card rounded-xl p-5 border border-border/60 flex flex-col justify-between">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">Szybkie akcje</h2>
          <div className="flex flex-col gap-2 flex-1 justify-center">
            <Link
              href="/dashboard/forms/new"
              className="flex items-center gap-3 px-4 py-3 bg-primary/8 text-primary rounded-lg hover:bg-primary/12 transition-colors text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nowy formularz
            </Link>
            <Link
              href="/dashboard/clients?new=true"
              className="flex items-center gap-3 px-4 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Dodaj klienta
            </Link>
            <AddAppointmentDialog 
              salonId={salon.id}
              trigger={
                <button className="flex items-center gap-3 w-full px-4 py-3 bg-accent/8 text-accent-foreground rounded-lg hover:bg-accent/12 transition-colors text-sm font-medium text-left">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Dodaj wizytę
                </button>
              }
            />
          </div>
        </div>
      </div>

      {/* Upcoming Appointments */}
      <div className="bg-card rounded-xl p-5 border border-border/60">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Nadchodzące wizyty</h2>
          <Link href="/dashboard/visits" className="text-primary hover:text-primary/80 text-xs font-medium transition-colors">
            Zobacz wszystkie →
          </Link>
        </div>
        {upcomingAppointments && upcomingAppointments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcomingAppointments.map((visit) => {
              const date = new Date(visit.start_time)
              return (
                <Link key={visit.id} href={`/dashboard/visits/${visit.id}`}
                  className="flex flex-col p-4 bg-secondary/40 rounded-xl hover:bg-secondary/70 transition-all duration-300 group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold text-foreground text-sm">
                      {date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}, {date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide
                       ${visit.status === 'scheduled' ? 'bg-[hsl(220,50%,50%)]/10 text-[hsl(220,50%,50%)]' : ''}
                       ${visit.status === 'completed' ? 'bg-[hsl(150,45%,45%)]/10 text-[hsl(150,45%,45%)]' : ''}
                       ${visit.status === 'cancelled' ? 'bg-destructive/10 text-destructive' : ''}
                       ${visit.status === 'pending_forms' ? 'bg-accent/10 text-accent-foreground' : ''}
                    `}>
                      {visit.status === 'pending_forms' ? 'Wymaga ankiety' : 
                       visit.status === 'scheduled' ? 'Zaplanowana' : 
                       visit.status === 'completed' ? 'Zakończona' : visit.status}
                    </span>
                  </div>
                  <h3 className="font-medium text-foreground text-sm">{visit.clients.name}</h3>
                  <p className="text-xs text-muted-foreground">{visit.treatments?.name}</p>
                </Link>
              )
            })}
          </div>
        ) : (
          <EmptyState 
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
            title="Brak nadchodzących wizyt"
            description="Dodaj wizytę, aby śledzić harmonogram gabinetu."
          />
        )}
      </div>

      {/* Recent Submissions */}
      <div className="bg-card rounded-xl p-5 border border-border/60">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Ostatnie odpowiedzi</h2>
          <Link href="/dashboard/submissions" className="text-primary hover:text-primary/80 text-xs font-medium transition-colors">
            Zobacz wszystkie →
          </Link>
        </div>
        {recentSubmissions && recentSubmissions.length > 0 ? (
          <div className="space-y-1.5">
            {recentSubmissions.map((submission: any) => (
              <div key={submission.id} className="flex items-center justify-between p-3.5 bg-secondary/40 rounded-xl">
                <div>
                  <p className="font-medium text-foreground text-sm">{submission.client_name || submission.client_email || 'Anonimowy'}</p>
                  <p className="text-xs text-muted-foreground">{submission.forms?.title}</p>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">{new Date(submission.created_at).toLocaleDateString('pl-PL')}</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
            title="Brak odpowiedzi"
            description="Utwórz formularz i udostępnij go klientom."
            action={{ href: '/dashboard/forms/new', label: 'Utwórz formularz' }}
          />
        )}
      </div>
    </div>
  )
}

function EmptyState({ icon, title, description, action }: { 
  icon: React.ReactNode; title: string; description: string; action?: { href: string; label: string } 
}) {
  return (
    <div className="text-center py-10">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-secondary text-muted-foreground/40 mb-4">
        {icon}
      </div>
      <h3 className="font-medium text-foreground text-sm mb-1">{title}</h3>
      <p className="text-muted-foreground text-xs mb-4">{description}</p>
      {action && (
        <Link 
          href={action.href}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors"
        >
          {action.label}
        </Link>
      )}
    </div>
  )
}
