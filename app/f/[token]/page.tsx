import { getClientFormByToken } from '@/actions/client-forms'
import { TokenFormClient } from '@/components/token-form-client'

interface Props {
  params: Promise<{ token: string }>
}

export default async function PublicFormPage({ params }: Props) {
  const { token } = await params
  
  const result = await getClientFormByToken(token)
  
  if (result.error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-purple-900/20 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {result.completed ? 'Formularz wypełniony' : 'Nieprawidłowy link'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {result.completed 
              ? 'Ten formularz został już wypełniony. Dziękujemy!'
              : 'Link do formularza jest nieprawidłowy lub wygasł.'}
          </p>
        </div>
      </div>
    )
  }

  const clientForm = result.clientForm!
  const form = clientForm.forms
  
  if (!form) {
      return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-purple-900/20 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl text-center">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Formularz niedostępny
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
            Nie udało się załadować danych formularza.
            </p>
        </div>
      </div>
      )
  }

  const client = clientForm.clients

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-purple-900/20 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {form.title}
          </h1>
          {form.description && (
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {form.description}
            </p>
          )}
          {client && (
            <p className="text-sm text-purple-600 dark:text-purple-400 mt-4">
              Formularz dla: <strong>{client.name}</strong>
            </p>
          )}
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8 shadow-xl">
          <TokenFormClient 
            token={token}
            form={form}
            clientName={client?.name}
            filledBy="client"
          />
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500 dark:text-gray-400">
          Powered by <span className="font-semibold text-purple-600">Docvue</span>
        </div>
      </div>
    </div>
  )
}
