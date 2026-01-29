import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { AddAppointmentDialog } from '@/components/admin/add-appointment-dialog'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  // Get current user's salon
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: salon } = await supabase
    .from('salons')
    .select('*')
    .eq('user_id', user?.id)
    .single()

  // Get counts
  const { count: formsCount } = await supabase
    .from('forms')
    .select('*', { count: 'exact', head: true })
    .eq('salon_id', salon?.id)

  const { count: clientsCount } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })
    .eq('salon_id', salon?.id)

  const { count: appointmentsCount } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('salon_id', salon?.id)

  const { count: submissionsCount } = await supabase
    .from('submissions')
    .select('*', { count: 'exact', head: true })
    .eq('salon_id', salon?.id)

  // Get recent submissions
  const { data: recentSubmissions } = await supabase
    .from('submissions')
    .select(`
      *,
      forms (title)
    `)
    .eq('salon_id', salon?.id)
    .order('created_at', { ascending: false })
    .limit(5)

  // Get upcoming appointments (next 3)
  const now = new Date()

  const { data: upcomingAppointments } = await supabase
    .from('appointments')
    .select(`
      *,
      treatments (name, duration_minutes),
      clients (name)
    `)
    .eq('salon_id', salon?.id)
    .gte('start_time', now.toISOString())
    .order('start_time', { ascending: true })
    .limit(3)

  const stats = [
    { 
      name: 'Klienci', 
      value: clientsCount || 0, 
      href: '/dashboard/clients',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      gradient: 'from-purple-500 to-pink-500'
    },
    { 
      name: 'Wizyty', 
      value: appointmentsCount || 0, 
      href: '/dashboard/visits',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      gradient: 'from-amber-500 to-orange-500'
    },
    { 
      name: 'Formularze', 
      value: formsCount || 0, 
      href: '/dashboard/forms',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      gradient: 'from-blue-500 to-cyan-500'
    },
    { 
      name: 'Odpowiedzi', 
      value: submissionsCount || 0, 
      href: '/dashboard/submissions',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      gradient: 'from-green-500 to-emerald-500'
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Witaj, {salon?.name || 'Gabinet'} 👋
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Oto podsumowanie Twojego gabinetu
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Link
            key={stat.name}
            href={stat.href}
            className="group relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all border border-gray-100 dark:border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.name}</p>
                <p className="text-4xl font-bold text-gray-900 dark:text-white mt-2">{stat.value}</p>
              </div>
              <div className={`p-4 rounded-2xl bg-gradient-to-r ${stat.gradient} text-white opacity-80 group-hover:opacity-100 transition-opacity`}>
                {stat.icon}
              </div>
            </div>
            <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.gradient} transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left`} />
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Szybkie akcje</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/forms/new"
            className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-medium rounded-xl hover:from-pink-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nowy formularz
          </Link>
          <Link
            href="/dashboard/clients?new=true"
            className="inline-flex items-center gap-2 px-5 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Dodaj klienta
          </Link>
             <AddAppointmentDialog 
               salonId={salon.id}
               trigger={
                <button
                  className="inline-flex items-center gap-2 px-5 py-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 font-medium rounded-xl hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all w-auto"
                >
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                   </svg>
                   Dodaj wizytę
                </button>
               }
             />
        </div>
      </div>

      {/* Upcoming Appointments */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Nadchodzące wizyty</h2>
          <Link href="/dashboard/visits" className="text-purple-600 hover:text-purple-700 text-sm font-medium">
            Zobacz wszystkie →
          </Link>
        </div>
        {upcomingAppointments && upcomingAppointments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingAppointments.map((visit) => {
              const date = new Date(visit.start_time)
              return (
                <Link 
                  key={visit.id} 
                  href={`/dashboard/visits/${visit.id}`}
                  className="flex flex-col p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/10 hover:border-purple-200 dark:hover:border-purple-800 border border-transparent transition-all"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-gray-900 dark:text-white text-lg">
                      {date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}, {date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium
                       ${visit.status === 'scheduled' ? 'bg-blue-100 text-blue-700' : ''}
                       ${visit.status === 'completed' ? 'bg-green-100 text-green-700' : ''}
                       ${visit.status === 'cancelled' ? 'bg-red-100 text-red-700' : ''}
                       ${visit.status === 'pending_forms' ? 'bg-orange-100 text-orange-700' : ''}
                    `}>
                      {visit.status === 'pending_forms' ? 'Wymaga ankiety' : 
                       visit.status === 'scheduled' ? 'Zaplanowana' : 
                       visit.status === 'completed' ? 'Zakończona' : visit.status}
                    </span>
                  </div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-1">{visit.clients.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{visit.treatments?.name}</p>
                </Link>
              )
            })}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Brak nadchodzących wizyt.</p>
        )}
      </div>

      {/* Recent Submissions */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Ostatnie odpowiedzi</h2>
          <Link href="/dashboard/submissions" className="text-purple-600 hover:text-purple-700 text-sm font-medium">
            Zobacz wszystkie →
          </Link>
        </div>
        
        {recentSubmissions && recentSubmissions.length > 0 ? (
          <div className="space-y-3">
            {recentSubmissions.map((submission: any) => (
              <div
                key={submission.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {submission.client_name || submission.client_email || 'Anonimowy'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {submission.forms?.title}
                  </p>
                </div>
                <span className="text-sm text-gray-400">
                  {new Date(submission.created_at).toLocaleDateString('pl-PL')}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            Brak odpowiedzi. Utwórz formularz i udostępnij go klientom!
          </p>
        )}
      </div>
    </div>
  )
}
