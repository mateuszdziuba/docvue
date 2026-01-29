import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function SubmissionsPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: salon } = await supabase
    .from('salons')
    .select('id')
    .eq('user_id', user?.id)
    .single()

  // Get all submissions with form info
  const { data: submissions } = await supabase
    .from('submissions')
    .select(`
      *,
      forms (id, title)
    `)
    .eq('salon_id', salon?.id)
    .order('created_at', { ascending: false })

  // Get forms for filter
  const { data: forms } = await supabase
    .from('forms')
    .select('id, title')
    .eq('salon_id', salon?.id)
    .order('title')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Odpowiedzi</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Wszystkie odpowiedzi z formularzy klientów
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Wszystkie odpowiedzi</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{submissions?.length || 0}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Dzisiaj</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
            {submissions?.filter(s => new Date(s.created_at).toDateString() === new Date().toDateString()).length || 0}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Z podpisami</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
            {submissions?.filter(s => s.signature).length || 0}
          </p>
        </div>
      </div>

      {/* Submissions List */}
      {submissions && submissions.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Klient
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Formularz
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Podpis
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Akcje
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {submissions.map((submission: any) => (
                  <tr key={submission.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {submission.client_name || 'Anonimowy'}
                        </p>
                        {submission.client_email && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {submission.client_email}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-700 dark:text-gray-300">
                        {submission.forms?.title || 'Nieznany'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-500 dark:text-gray-400">
                        {new Date(submission.created_at).toLocaleString('pl-PL', {
                          dateStyle: 'short',
                          timeStyle: 'short'
                        })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {submission.signature ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-medium">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Podpisano
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/dashboard/submissions/${submission.id}`}
                        className="text-purple-600 hover:text-purple-700 font-medium text-sm"
                      >
                        Zobacz szczegóły
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Brak odpowiedzi
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Gdy klienci wypełnią Twoje formularze, odpowiedzi pojawią się tutaj.
          </p>
          <Link
            href="/dashboard/forms/new"
            className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-medium rounded-xl hover:from-pink-600 hover:to-purple-700 transition-all"
          >
            Utwórz formularz
          </Link>
        </div>
      )}
    </div>
  )
}
