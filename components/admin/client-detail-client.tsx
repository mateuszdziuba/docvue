'use client'

import { useState } from 'react'
import Link from 'next/link'
import { assignFormToClient, deleteClientForm } from '@/actions/client-forms'
import type { Client, ClientForm, Submission } from '@/types/database'

interface Props {
  client: Client
  clientForms: (ClientForm & { forms: { id: string; title: string; description: string | null } })[]
  availableForms: { id: string; title: string }[]
  submissions: (Submission & { forms: { title: string } })[]
}

export function ClientDetailClient({ client, clientForms, availableForms, submissions }: Props) {
  const [isAssigning, setIsAssigning] = useState(false)
  const [selectedFormId, setSelectedFormId] = useState('')
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [assignmentToDelete, setAssignmentToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleAssignForm = async () => {
    if (!selectedFormId) return
    
    setIsAssigning(true)
    const result = await assignFormToClient({
      clientId: client.id,
      formId: selectedFormId,
    })
    
    if (result.error) {
      alert(`Błąd przypisywania: ${result.error}`)
      setIsAssigning(false)
      return
    }

    if (result.token) {
      const link = `${window.location.origin}/f/${result.token}`
      await navigator.clipboard.writeText(link)
      setCopiedToken(result.token)
      setTimeout(() => setCopiedToken(null), 3000)
    }
    
    setSelectedFormId('')
    setIsAssigning(false)
  }

  const handleCopyLink = async (token: string) => {
    const link = `${window.location.origin}/f/${token}`
    await navigator.clipboard.writeText(link)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 3000)
  }

  const handleDeleteClick = (clientFormId: string) => {
    setAssignmentToDelete(clientFormId)
  }

  const handleConfirmDelete = async () => {
    if (!assignmentToDelete) return
    setIsDeleting(true)
    try {
      await deleteClientForm(assignmentToDelete)
      setAssignmentToDelete(null)
    } catch (error) {
      console.error('Error deleting assignment:', error)
      alert('Wystąpił błąd podczas usuwania przypisania')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Assign New Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Przypisz formularz
        </h2>
        <div className="flex items-center gap-4">
          <select
            value={selectedFormId}
            onChange={(e) => setSelectedFormId(e.target.value)}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Wybierz formularz...</option>
            {availableForms.map((form) => (
              <option key={form.id} value={form.id}>{form.title}</option>
            ))}
          </select>
          <button
            onClick={handleAssignForm}
            disabled={!selectedFormId || isAssigning}
            className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-medium rounded-lg disabled:opacity-50 transition-all"
          >
            {isAssigning ? 'Przypisywanie...' : 'Przypisz'}
          </button>
        </div>
        {copiedToken && (
          <p className="mt-3 text-sm text-green-600 dark:text-green-400">
            ✓ Link skopiowany do schowka!
          </p>
        )}
      </div>

      {/* Assigned Forms */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Przypisane formularze
          <span className="ml-2 text-sm font-normal text-gray-500">({clientForms.length})</span>
        </h2>
        
        {clientForms.length > 0 ? (
          <div className="space-y-3">
            {clientForms.map((cf) => (
              <div key={cf.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {cf.forms?.title}
                  </h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      cf.status === 'completed' 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}>
                      {cf.status === 'completed' ? 'Wypełniony' : 'Oczekuje'}
                    </span>
                    {cf.filled_at && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(cf.filled_at).toLocaleDateString('pl-PL')}
                        {cf.filled_by === 'staff' && ' (salon)'}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      Dodano: {new Date(cf.created_at).toLocaleDateString('pl-PL')}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {cf.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleCopyLink(cf.token)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                          copiedToken === cf.token
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500'
                        }`}
                      >
                        {copiedToken === cf.token ? '✓ Skopiowano' : 'Kopiuj link'}
                      </button>
                      <Link
                        href={`/dashboard/clients/${client.id}/fill/${cf.token}`}
                        className="px-3 py-1.5 text-sm font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50 rounded-lg transition-all"
                      >
                        Wypełnij w salonie
                      </Link>
                    </>
                  )}
                  <button
                    onClick={() => handleDeleteClick(cf.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                    title="Usuń"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            Brak przypisanych formularzy. Wybierz formularz powyżej i kliknij &#34;Przypisz&#34;.
          </p>
        )}
      </div>

      {/* Recent Submissions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Historia wypełnień
          <span className="ml-2 text-sm font-normal text-gray-500">({submissions.length})</span>
        </h2>
        
        {submissions.length > 0 ? (
          <div className="space-y-2">
            {submissions.map((sub) => (
              <Link 
                key={sub.id} 
                href={`/dashboard/submissions/${sub.id}`}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {sub.forms?.title}
                  </span>
                  <span className="ml-3 text-sm text-gray-500 dark:text-gray-400">
                    {new Date(sub.created_at).toLocaleDateString('pl-PL', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                {sub.signature && (
                  <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded">
                    Z podpisem
                  </span>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            Brak wypełnionych formularzy.
          </p>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {assignmentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                  <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Usuń przypisanie</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Czy na pewno chcesz usunąć ten formularz z konta klienta?
                  </p>
                </div>
              </div>
              
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-900/50 rounded-xl p-4 mb-6">
                <p className="text-sm text-yellow-700 dark:text-yellow-300 font-medium flex gap-2">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Jeśli formularz został już wypełniony, usunięcie przypisania spowoduje również trwałe usunięcie przesłanych odpowiedzi.
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setAssignmentToDelete(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium disabled:opacity-50"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isDeleting && (
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  {isDeleting ? 'Usuwanie...' : 'Usuń'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
