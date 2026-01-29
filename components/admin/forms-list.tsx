'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ShareFormModal } from './share-form-modal'
import { toggleFormActive, toggleFormPublic, deleteForm } from '@/actions/forms'
import type { Form } from '@/types/database'

interface FormsListProps {
  forms: Form[]
}

export function FormsList({ forms }: FormsListProps) {
  const [shareForm, setShareForm] = useState<Form | null>(null)

  const handleTogglePublic = async (form: Form) => {
    await toggleFormPublic(form.id, !form.is_public)
  }

  const handleToggleActive = async (form: Form) => {
    await toggleFormActive(form.id, !form.is_active)
  }

  const handleDelete = async (formId: string) => {
    if (confirm('Czy na pewno chcesz usunąć ten formularz?')) {
      await deleteForm(formId)
    }
  }

  if (forms.length === 0) {
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
                  <div className="flex gap-2">
                    {form.is_public && (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                        Publiczny
                      </span>
                    )}
                    {!form.is_active && (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                        Nieaktywny
                      </span>
                    )}
                  </div>
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
                {/* Share Button */}
                <button
                  onClick={() => setShareForm(form)}
                  disabled={!form.is_public}
                  className={`p-2 rounded-lg transition-colors ${
                    form.is_public
                      ? 'text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30'
                      : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                  }`}
                  title={form.is_public ? 'Udostępnij' : 'Najpierw ustaw jako publiczny'}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </button>

                {/* Toggle Public */}
                <button
                  onClick={() => handleTogglePublic(form)}
                  className={`p-2 rounded-lg transition-colors ${
                    form.is_public
                      ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30'
                      : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  title={form.is_public ? 'Ustaw jako prywatny' : 'Ustaw jako publiczny'}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {form.is_public ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    )}
                  </svg>
                </button>

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
                  onClick={() => handleDelete(form.id)}
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

      {/* Share Modal */}
      {shareForm && (
        <ShareFormModal
          form={shareForm}
          isOpen={!!shareForm}
          onClose={() => setShareForm(null)}
        />
      )}
    </>
  )
}
