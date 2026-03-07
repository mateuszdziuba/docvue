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

  // Parallel data fetching
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

  // Recent submissions
  const { data: recentSubmissions } = await supabase
    .from('submissions')
    .select(`*, forms (title)`)
    .eq('salon_id', salon?.id)
    .order('created_at', { ascending: false })
    .limit(5)

  // Upcoming appointments
  const now = new Date()
  const { data: upcomingAppointments } = await supabase
    .from('appointments')
    .select(`*, treatments (name, duration_minutes), clients (name)`)
    .eq('salon_id', salon?.id)
    .gte('start_time', now.toISOString())
    .order('start_time', { ascending: true })
    .limit(3)

  // Sync appointment statuses in the background — don't block page render
  if (upcomingAppointments && upcomingAppointments.length > 0) {
    const appointmentIds = upcomingAppointments.map(a => a.id)
    syncMultipleAppointmentStatuses(appointmentIds).catch(() => {})
  }

  // 7-day chart data
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
    {
      name: 'Klienci',
      value: clientsCount || 0,
      href: '/dashboard/clients',
      icon: (
        <svg className="w-4.5 h-4.5" style={{ width: '1.125rem', height: '1.125rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      color: 'primary',
    },
    {
      name: 'Wizyty',
      value: appointmentsCount || 0,
      href: '/dashboard/visits',
      icon: (
        <svg className="w-4.5 h-4.5" style={{ width: '1.125rem', height: '1.125rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      color: 'accent',
    },
    {
      name: 'Formularze',
      value: formsCount || 0,
      href: '/dashboard/forms',
      icon: (
        <svg className="w-4.5 h-4.5" style={{ width: '1.125rem', height: '1.125rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: 'info',
    },
    {
      name: 'Odpowiedzi',
      value: submissionsCount || 0,
      href: '/dashboard/submissions',
      icon: (
        <svg className="w-4.5 h-4.5" style={{ width: '1.125rem', height: '1.125rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      color: 'success',
    },
  ]

  type ColorKey = 'primary' | 'accent' | 'info' | 'success'
  const colorMap: Record<ColorKey, { bg: string; text: string; border: string }> = {
    primary: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-l-primary' },
    accent: { bg: 'bg-accent/10', text: 'text-accent', border: 'border-l-accent' },
    info: { bg: 'bg-info/10', text: 'text-info', border: 'border-l-info' },
    success: { bg: 'bg-success/10', text: 'text-success', border: 'border-l-success' },
  }

  const statusConfig: Record<string, { label: string; className: string }> = {
    scheduled: { label: 'Zaplanowana', className: 'bg-info/10 text-info' },
    completed: { label: 'Zakończona', className: 'bg-success/10 text-success' },
    cancelled: { label: 'Anulowana', className: 'bg-destructive/10 text-destructive' },
    pending_forms: { label: 'Wymaga ankiety', className: 'bg-accent/10 text-accent-foreground' },
  }

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">
          Witaj, {salon?.name || 'Gabinet'}
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">Oto podsumowanie Twojego gabinetu</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat) => {
          const c = colorMap[stat.color as ColorKey]
          return (
            <Link
              key={stat.name}
              href={stat.href}
              className={`group bg-card rounded-xl p-4 border border-border/60 hover:border-border border-l-4 ${c.border} transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-foreground/5`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{stat.name}</p>
                  <p className="text-3xl font-bold text-foreground mt-1.5 tabular-nums leading-none">{stat.value}</p>
                </div>
                <div className={`p-2 rounded-lg ${c.bg} ${c.text} shrink-0`}>
                  {stat.icon}
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Chart + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Weekly Chart */}
        <div className="lg:col-span-3 bg-card rounded-xl p-5 border border-border/60">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">Ostatnie 7 dni</h2>
            <div className="flex items-center gap-4 text-[10px] font-medium text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary" />
                Wizyty
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-accent" />
                Odpowiedzi
              </span>
            </div>
          </div>
          <WeeklyChart data={chartData} />
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-2 bg-card rounded-xl p-5 border border-border/60 flex flex-col">
          <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">Szybkie akcje</h2>
          <div className="flex flex-col gap-2 flex-1 justify-center">
            <Link
              href="/dashboard/forms/new"
              className="flex items-center gap-3 px-4 py-3 bg-primary/8 text-primary rounded-xl hover:bg-primary/12 transition-colors text-sm font-medium"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nowy formularz
            </Link>
            <Link
              href="/dashboard/clients?new=true"
              className="flex items-center gap-3 px-4 py-3 bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/80 transition-colors text-sm font-medium"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Dodaj klienta
            </Link>
            <AddAppointmentDialog
              salonId={salon.id}
              trigger={
                <button className="flex items-center gap-3 w-full px-4 py-3 bg-accent/8 text-accent-foreground rounded-xl hover:bg-accent/12 transition-colors text-sm font-medium text-left">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">Nadchodzące wizyty</h2>
          <Link href="/dashboard/visits" className="text-primary hover:text-primary/80 text-xs font-medium transition-colors">
            Zobacz wszystkie →
          </Link>
        </div>
        {upcomingAppointments && upcomingAppointments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {upcomingAppointments.map((visit) => {
              const date = new Date(visit.start_time)
              const status = statusConfig[visit.status] ?? { label: visit.status, className: 'bg-secondary text-secondary-foreground' }
              return (
                <Link
                  key={visit.id}
                  href={`/dashboard/visits/${visit.id}`}
                  className="flex flex-col p-4 bg-secondary/40 rounded-xl hover:bg-secondary/70 transition-all duration-200 group border border-transparent hover:border-border/60"
                >
                  <div className="flex justify-between items-start mb-2.5 gap-2">
                    <span className="font-semibold text-foreground text-sm">
                      {date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })},{' '}
                      {date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide shrink-0 ${status.className}`}>
                      {status.label}
                    </span>
                  </div>
                  <h3 className="font-medium text-foreground text-sm">{visit.clients.name}</h3>
                  {visit.treatments?.name && (
                    <p className="text-xs text-muted-foreground mt-0.5">{visit.treatments.name}</p>
                  )}
                </Link>
              )
            })}
          </div>
        ) : (
          <EmptyState
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
            title="Brak nadchodzących wizyt"
            description="Dodaj wizytę, aby śledzić harmonogram gabinetu."
          />
        )}
      </div>

      {/* Recent Submissions */}
      <div className="bg-card rounded-xl p-5 border border-border/60">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">Ostatnie odpowiedzi</h2>
          <Link href="/dashboard/submissions" className="text-primary hover:text-primary/80 text-xs font-medium transition-colors">
            Zobacz wszystkie →
          </Link>
        </div>
        {recentSubmissions && recentSubmissions.length > 0 ? (
          <div className="space-y-1">
            {recentSubmissions.map((submission: any) => (
              <div key={submission.id} className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-secondary/40 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                    {(submission.client_name || submission.client_email || 'A')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">
                      {submission.client_name || submission.client_email || 'Anonimowy'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{submission.forms?.title}</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums shrink-0 ml-3">
                  {new Date(submission.created_at).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
            title="Brak odpowiedzi"
            description="Utwórz formularz i udostępnij go klientom."
            action={{ href: '/dashboard/forms/new', label: 'Utwórz formularz' }}
          />
        )}
      </div>
    </div>
  )
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode
  title: string
  description: string
  action?: { href: string; label: string }
}) {
  return (
    <div className="text-center py-10">
      <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-secondary text-muted-foreground/40 mb-3">
        {icon}
      </div>
      <h3 className="font-medium text-foreground text-sm mb-1">{title}</h3>
      <p className="text-muted-foreground text-xs mb-4">{description}</p>
      {action && (
        <Link
          href={action.href}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors"
        >
          {action.label}
        </Link>
      )}
    </div>
  )
}
