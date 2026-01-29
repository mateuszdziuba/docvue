import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { deleteSubmission } from '@/actions/submissions'

interface Props {
  params: Promise<{ id: string }>
}

export default async function SubmissionDetailsPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: salon } = await supabase
    .from('salons')
    .select('id')
    .eq('user_id', user?.id)
    .single()

  // Get submission with form info
  const { data: submission, error } = await supabase
    .from('submissions')
    .select(`
      *,
      forms (id, title, description, schema)
    `)
    .eq('id', id)
    .eq('salon_id', salon?.id)
    .single()

  if (error || !submission) {
    notFound()
  }

  const formFields = (submission.forms?.schema as any)?.fields || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link 
            href="/dashboard/submissions" 
            className="text-purple-600 hover:text-purple-700 text-sm font-medium mb-2 inline-flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Wróć do listy
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Szczegóły odpowiedzi
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {submission.forms?.title}
          </p>
        </div>
        <form action={async () => {
          'use server'
          await deleteSubmission(id)
        }}>
          <button
            type="submit"
            className="px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-sm font-medium"
            onClick={(e) => {
               if (!confirm('Czy na pewno chcesz usunąć tę odpowiedź? Tej operacji nie można cofnąć.')) {
                 e.preventDefault()
               }
            }}
          >
            Usuń odpowiedź
          </button>
        </form>
      </div>

      {/* Client Info Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Informacje o kliencie
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Imię</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {submission.client_name || 'Brak'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {submission.client_email || 'Brak'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Data wypełnienia</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {new Date(submission.created_at).toLocaleString('pl-PL', {
                dateStyle: 'long',
                timeStyle: 'short'
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Form Responses */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Odpowiedzi na formularz
        </h2>
        <div className="space-y-4">
          {formFields.map((field: any) => {
            const value = (submission.data as any)?.[field.name]
            if (field.type === 'separator') return null

            const isSignature = field.type === 'signature' || field.type === 'Signature'
            
            return (
              <div key={field.name} className="border-b border-gray-100 dark:border-gray-700 pb-4 last:border-0">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  {field.label || field.name}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </p>
                {isSignature && value ? (
                  <div className="mt-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={value} 
                      alt="Podpis klienta" 
                      className="max-w-[300px] h-auto border border-gray-200 dark:border-gray-600 rounded-lg bg-white"
                    />
                  </div>
                ) : (
                  <p className="font-medium text-gray-900 dark:text-white">
                    {typeof value === 'boolean' 
                      ? (value ? 'Tak' : 'Nie') 
                      : (value || <span className="text-gray-400">Brak odpowiedzi</span>)}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Standalone Signature (if stored separately) */}
      {submission.signature && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Podpis klienta
          </h2>
          <div className="inline-block border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={submission.signature} 
              alt="Podpis klienta" 
              className="max-w-[400px] h-auto"
            />
          </div>
        </div>
      )}

      {/* Raw Data (collapsible) */}
      <details className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <summary className="px-6 py-4 cursor-pointer text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
          Pokaż surowe dane odpowiedzi (JSON)
        </summary>
        <pre className="px-6 pb-4 text-xs text-gray-600 dark:text-gray-400 overflow-x-auto">
          {JSON.stringify(submission.data, null, 2)}
        </pre>
      </details>
    </div>
  )
}
