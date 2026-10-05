import { createFileRoute, Link } from '@tanstack/react-router'
import { format, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'
import { type AppointmentStatus, StatusBadge } from '@/components/admin/status-badge'
import { WeeklyChart } from '@/components/admin/weekly-chart'
import { useInvalidateOnFocus } from '@/lib/use-invalidate-on-focus'
import { getDashboardStatsFn } from '@/src/server/dashboard'

export const Route = createFileRoute('/_authed/dashboard/')({
  loader: async () => {
    const stats = await getDashboardStatsFn()
    return { stats }
  },
  component: DashboardPage,
})

function normalizeStatus(status: string): AppointmentStatus {
  if (status === 'completed' || status === 'cancelled' || status === 'pending_forms') return status
  return 'scheduled'
}

function DashboardPage() {
  useInvalidateOnFocus()
  const { stats } = Route.useLoaderData()

  if (!stats) return null

  const statCards = [
    {
      label: 'Formularze',
      value: stats.formsCount,
      href: '/dashboard/forms',
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      ),
    },
    {
      label: 'Klienci',
      value: stats.clientsCount,
      href: '/dashboard/clients',
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
        />
      ),
    },
    {
      label: 'Wizyty',
      value: stats.appointmentsCount,
      href: '/dashboard/visits',
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      ),
    },
    {
      label: 'Odpowiedzi',
      value: stats.submissionsCount,
      href: '/dashboard/submissions',
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
        />
      ),
    },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-7">
      <div>
        <h1 className="font-serif text-2xl font-normal text-foreground tracking-tight">Przegląd</h1>
        <p className="text-muted-foreground text-sm mt-1">Przegląd aktywności gabinetu</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Link
            key={card.label}
            to={card.href}
            className="min-w-0 bg-card rounded-xl p-5 border border-border hover:border-primary/40 hover:shadow-[0_2px_12px_rgb(111_89_87/0.08)] transition-all duration-150 group"
          >
            <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center mb-4">
              <svg
                className="w-4 h-4 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                {card.icon}
              </svg>
            </div>
            <p className="font-serif text-2xl font-normal text-foreground tabular-nums">
              {card.value}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 tracking-[0.08em] uppercase font-medium">
              {card.label}
            </p>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Weekly chart */}
        <div className="min-w-0 overflow-hidden bg-card rounded-xl border border-border p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Aktywność (7 dni)</h2>
          <WeeklyChart data={stats.chartData} />
        </div>

        {/* Upcoming appointments */}
        <div className="min-w-0 overflow-hidden bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Nadchodzące wizyty</h2>
            <Link to="/dashboard/calendar" className="text-xs text-primary hover:underline">
              Kalendarz →
            </Link>
          </div>
          {stats.upcomingAppointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Brak zaplanowanych wizyt</p>
          ) : (
            <div className="divide-y divide-border">
              {stats.upcomingAppointments.map((apt: any) => (
                <Link
                  key={apt.id}
                  to="/dashboard/visits/$visitId"
                  params={{ visitId: apt.id }}
                  className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {(apt.clients as { name: string } | null)?.name ?? 'Klient'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {(apt.treatments as { name: string } | null)?.name ?? 'Zabieg'} ·{' '}
                      {format(parseISO(apt.start_time), 'd MMM, HH:mm', { locale: pl })}
                    </p>
                  </div>
                  <StatusBadge
                    status={normalizeStatus(apt.status)}
                    withIcon={false}
                    className="text-xs shrink-0"
                  />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent submissions */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">Ostatnie odpowiedzi</h2>
          <Link to="/dashboard/submissions" className="text-xs text-primary hover:underline">
            Wszystkie →
          </Link>
        </div>
        {stats.recentSubmissions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Brak odpowiedzi</p>
        ) : (
          <div className="divide-y divide-border">
            {stats.recentSubmissions.map((sub: any) => (
              <Link
                key={sub.id}
                to="/dashboard/submissions/$submissionId"
                params={{ submissionId: sub.id }}
                className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {sub.client_name ?? 'Anonim'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {(sub.forms as { title: string } | null)?.title ?? 'Formularz'}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground tabular-nums shrink-0">
                  {format(parseISO(sub.created_at), 'd MMM HH:mm', { locale: pl })}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
