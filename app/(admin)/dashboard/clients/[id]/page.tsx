import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ClientDetailClient } from '@/components/admin/client-detail-client'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ClientDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: salon } = await supabase
    .from('salons')
    .select('id')
    .eq('user_id', user?.id)
    .single()

  // Get client
  const { data: client, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .eq('salon_id', salon?.id)
    .single()

  if (error || !client) {
    notFound()
  }

  // Get client's assigned forms
  const { data: clientForms } = await supabase
    .from('client_forms')
    .select(`
      *,
      forms (id, title, description)
    `)
    .eq('client_id', id)
    .order('created_at', { ascending: false })

  // Get all available forms for assignment
  const { data: availableForms } = await supabase
    .from('forms')
    .select('id, title')
    .eq('salon_id', salon?.id)
    .eq('is_active', true)
    .order('title')

  // Get client's submissions
  const { data: submissions } = await supabase
    .from('submissions')
    .select(`
      *,
      forms (title)
    `)
    .eq('client_id', id)
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link 
            href="/dashboard/clients" 
            className="text-purple-600 hover:text-purple-700 text-sm font-medium mb-2 inline-flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Wróć do listy
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {client.name}
          </h1>
          <div className="flex items-center gap-4 mt-2 text-gray-500 dark:text-gray-400">
            {client.email && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {client.email}
              </span>
            )}
            {client.phone && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {client.phone}
              </span>
            )}
          </div>
        </div>
      </div>

      <ClientDetailClient 
        client={client}
        clientForms={clientForms || []}
        availableForms={availableForms || []}
        submissions={submissions || []}
      />
    </div>
  )
}
