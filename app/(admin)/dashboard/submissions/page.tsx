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

  const { data: submissions } = await supabase
    .from('submissions')
    .select(`
      *,
      forms (id, title)
    `)
    .eq('salon_id', salon?.id)
    .order('created_at', { ascending: false })

  const { data: forms } = await supabase
    .from('forms')
    .select('id, title')
    .eq('salon_id', salon?.id)
    .order('title')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Odpowiedzi</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Wszystkie odpowiedzi z formularzy klientów
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-card rounded-xl p-5 border border-border/60">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Wszystkie odpowiedzi</p>
          <p className="text-3xl font-bold text-foreground mt-1">{submissions?.length || 0}</p>
        </div>
        <div className="bg-card rounded-xl p-5 border border-border/60">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Dzisiaj</p>
          <p className="text-3xl font-bold text-foreground mt-1">
            {submissions?.filter(s => new Date(s.created_at).toDateString() === new Date().toDateString()).length || 0}
          </p>
        </div>
        <div className="bg-card rounded-xl p-5 border border-border/60">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Z podpisami</p>
          <p className="text-3xl font-bold text-foreground mt-1">
            {submissions?.filter(s => s.signature).length || 0}
          </p>
        </div>
      </div>

      {/* Submissions List */}
      {submissions && submissions.length > 0 ? (
        <div className="bg-card rounded-xl border border-border/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Klient
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Formularz
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Podpis
                  </th>
                  <th className="px-5 py-3 text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Akcje
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {submissions.map((submission: any) => (
                  <tr key={submission.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="font-medium text-foreground text-sm">
                          {submission.client_name || 'Anonimowy'}
                        </p>
                        {submission.client_email && (
                          <p className="text-xs text-muted-foreground">
                            {submission.client_email}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-foreground/80">
                        {submission.forms?.title || 'Nieznany'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-muted-foreground">
                        {new Date(submission.created_at).toLocaleString('pl-PL', {
                          dateStyle: 'short',
                          timeStyle: 'short'
                        })}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {submission.signature ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[hsl(150,45%,45%)]/10 text-[hsl(150,45%,45%)] text-xs font-medium">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Podpisano
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={`/dashboard/submissions/${submission.id}`}
                        className="text-primary hover:text-primary/80 font-medium text-sm"
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
        <div className="text-center py-14 bg-card rounded-xl border border-border/60">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-secondary mb-4">
            <svg className="w-6 h-6 text-muted-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="font-medium text-foreground mb-1">
            Brak odpowiedzi
          </h3>
          <p className="text-muted-foreground text-sm mb-6">
            Gdy klienci wypełnią Twoje formularze, odpowiedzi pojawią się tutaj.
          </p>
          <Link
            href="/dashboard/forms/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            Utwórz formularz
          </Link>
        </div>
      )}
    </div>
  )
}
