'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AddClientForm } from './add-client-form'
import { deleteClient } from '@/actions/clients'
import type { Client } from '@/types/database'

import { SearchInput } from '@/components/ui/search-input'

interface ClientsListProps {
  clients: Client[]
  query?: string
}

export function ClientsList({ clients, query }: ClientsListProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [clientToDelete, setClientToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteClick = (e: React.MouseEvent, clientId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setClientToDelete(clientId)
  }

  const handleConfirmDelete = async () => {
    if (!clientToDelete) return
    setIsDeleting(true)
    try {
      await deleteClient(clientToDelete)
      setClientToDelete(null)
    } catch (error) {
      console.error('Error deleting client:', error)
      alert('Wystąpił błąd podczas usuwania klienta')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <div className="space-y-6">
        {/* Add Client Button / Form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          {showAddForm ? (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Dodaj nowego klienta
              </h3>
              <AddClientForm 
                onSuccess={() => setShowAddForm(false)}
                onCancel={() => setShowAddForm(false)}
              />
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-medium rounded-xl hover:from-pink-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Dodaj klienta
            </button>
          )}
        </div>

        {/* Search - Moved here as requested */}
        <div className="w-full">
          <SearchInput placeholder="Szukaj klientów (imię, email)..." />
        </div>

        {/* Clients List */}
        {clients.length > 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Klient
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Telefon
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Data dodania
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Akcje
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {clients.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-6 py-4">
                        <Link href={`/dashboard/clients/${client.id}`} className="block">
                          <p className="font-medium text-gray-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                            {client.name}
                          </p>
                          {client.email && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {client.email}
                            </p>
                          )}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-700 dark:text-gray-300">
                          {client.phone || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-500 dark:text-gray-400">
                          {new Date(client.created_at).toLocaleDateString('pl-PL')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/dashboard/clients/${client.id}`}
                            className="px-3 py-1.5 text-sm font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-all"
                          >
                            Zarządzaj
                          </Link>
                          <button
                            onClick={(e) => handleDeleteClick(e, client.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                            title="Usuń"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
            {query ? (
              <>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                  Brak wyników wyszukiwania
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Nie znaleziono klientów pasujących do zapytania "{query}"
                </p>
              </>
            ) : (
              <>
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Brak klientów
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  Dodaj pierwszego klienta używając przycisku powyżej.
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {clientToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                  <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Usuń klienta</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Czy na pewno chcesz usunąć tego klienta? Ta operacja jest nieodwracalna.
                  </p>
                </div>
              </div>
              
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-xl p-4 mb-6">
                <p className="text-sm text-red-700 dark:text-red-300 font-medium flex gap-2">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Usunięcie klienta spowoduje trwałe usunięcie wszystkich jego danych, przypisanych formularzy oraz udzielonych odpowiedzi!
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setClientToDelete(null)}
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
                  {isDeleting ? 'Usuwanie...' : 'Usuń klienta'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
