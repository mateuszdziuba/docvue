'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toggleFormActive, deleteForm } from '@/actions/forms'
import type { Form } from '@/types/database'

interface FormsListProps {
  forms: Form[]
  query?: string
}

export function FormsList({ forms, query }: FormsListProps) {
  const [formToDelete, setFormToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleToggleActive = async (form: Form) => {
    await toggleFormActive(form.id, !form.is_active)
  }

  const handleDeleteClick = (formId: string) => {
    setFormToDelete(formId)
  }

  const handleConfirmDelete = async () => {
    if (!formToDelete) return
    setIsDeleting(true)
    try {
      await deleteForm(formToDelete)
      setFormToDelete(null)
    } catch (error) {
      console.error('Error deleting form:', error)
      alert('Wystąpił błąd podczas usuwania formularza')
    } finally {
      setIsDeleting(false)
    }
  }

  if (forms.length === 0) {
    if (query) {
      return (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
            Brak wyników wyszukiwania
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Nie znaleziono formularzy pasujących do zapytania "{query}"
          </p>
        </div>
      )
    }

    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Brak formularzy
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Utwórz swój pierwszy formularz, aby rozpocząć zbieranie danych od klientów.
        </p>
        <Link
          href="/dashboard/forms/new"
          className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-medium rounded-xl hover:from-pink-600 hover:to-purple-700 transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Utwórz formularz
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-4">
        {forms.map((form) => (
          <div
            key={form.id}
            className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                    {form.title}
                  </h3>
                  {!form.is_active && (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                      Nieaktywny
                    </span>
                  )}
                </div>
                {form.description && (
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                    {form.description}
                  </p>
                )}
                <p className="text-xs text-gray-400">
                  Utworzono: {new Date(form.created_at).toLocaleDateString('pl-PL')}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {/* Edit */}
                <Link
                  href={`/dashboard/forms/${form.id}/edit`}
                  className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                  title="Edytuj"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </Link>

                {/* Delete */}
                <button
                  onClick={() => handleDeleteClick(form.id)}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                  title="Usuń"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {formToDelete && (
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
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Usuń formularz</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Czy na pewno chcesz usunąć ten formularz? Ta operacja jest nieodwracalna.
                  </p>
                </div>
              </div>
              
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-xl p-4 mb-6">
                <p className="text-sm text-red-700 dark:text-red-300 font-medium flex gap-2">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Usunięcie formularza spowoduje również usunięcie wszystkich przypisań do klientów oraz ich odpowiedzi!
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setFormToDelete(null)}
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
                  {isDeleting ? 'Usuwanie...' : 'Usuń formularz'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
