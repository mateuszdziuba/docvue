import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'

export default async function ClientProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: client } = await supabase.from('clients').select('*').eq('user_id', user.id).single()

  if (!client) return <div>Nie znaleziono profilu</div>

  const { data: history } = await supabase
    .from('appointments')
    .select(`
      *,
      treatments (name)
    `)
    .eq('client_id', client.id)
    .order('start_time', { ascending: false })
    .limit(20)

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
        <div className="h-16 w-16 bg-gradient-to-br from-pink-400 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
          {client.name.charAt(0)}
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{client.name}</h1>
          <p className="text-gray-500">{client.email}</p>
          <p className="text-gray-500">{client.phone}</p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Historia wizyt</h2>
        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700">
          {history && history.length > 0 ? (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {history.map((apt) => (
                <div key={apt.id} className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{apt.treatments?.name}</p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(apt.start_time), 'd MMMM yyyy, HH:mm', { locale: pl })}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    apt.status === 'completed' ? 'bg-green-100 text-green-700' : 
                    apt.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {apt.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
             <div className="p-6 text-center text-gray-500">Brak historii wizyt</div>
          )}
        </div>
      </div>
    </div>
  )
}
