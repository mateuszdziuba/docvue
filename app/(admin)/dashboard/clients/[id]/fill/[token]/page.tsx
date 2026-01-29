import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getClientFormByToken } from '@/actions/client-forms'
import { TokenFormClient } from '@/components/token-form-client'
import Link from 'next/link'

interface Props {
  params: Promise<{ id: string; token: string }>
}

export default async function FillFormInSalonPage({ params }: Props) {
  const { id, token } = await params
  const supabase = await createClient()
  
  // Verify user is logged in
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Get client form by token
  const result = await getClientFormByToken(token)
  
  if (result.error) {
    return (
      <div className="space-y-6">
        <Link 
          href={`/dashboard/clients/${id}`}
          className="text-purple-600 hover:text-purple-700 text-sm font-medium inline-flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Wróć do klienta
        </Link>
        
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
          <h1 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">
            {result.completed ? 'Formularz już wypełniony' : 'Błąd'}
          </h1>
          <p className="text-red-600 dark:text-red-400">
            {result.error}
          </p>
        </div>
      </div>
    )
  }

  const clientForm = result.clientForm!
  const form = clientForm.forms
  const client = clientForm.clients

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link 
          href={`/dashboard/clients/${id}`}
          className="text-purple-600 hover:text-purple-700 text-sm font-medium mb-2 inline-flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Wróć do klienta
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Wypełnij formularz w salonie
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Wypełniasz formularz <strong>{form.title}</strong> dla klienta <strong>{client?.name}</strong>
        </p>
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <TokenFormClient 
          token={token}
          form={form}
          clientName={client?.name}
          filledBy="staff"
        />
      </div>
    </div>
  )
}
