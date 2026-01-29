'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { deleteSubmission } from '@/actions/submissions'

interface DeleteSubmissionButtonProps {
  submissionId: string
}

export function DeleteSubmissionButton({ submissionId }: DeleteSubmissionButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    setIsDeleting(true)
    const result = await deleteSubmission(submissionId)
    
    if (result.error) {
      toast.error(result.error)
      setIsDeleting(false)
      setShowConfirm(false)
      return
    }

    toast.success('Odpowiedź została usunięta')
    router.push('/dashboard/submissions')
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        disabled={isDeleting}
        className="px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
      >
        Usuń odpowiedź
      </button>

      {showConfirm && (
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
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Usuń odpowiedź</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Czy na pewno chcesz usunąć tę odpowiedź?
                  </p>
                </div>
              </div>
              
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-xl p-4 mb-6">
                <p className="text-sm text-red-700 dark:text-red-300 font-medium flex gap-2">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Tej operacji nie można cofnąć.
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={isDeleting}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium disabled:opacity-50"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Usuwanie...
                    </>
                  ) : (
                    'Usuń odpowiedź'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
