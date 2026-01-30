'use client'

import { useState } from 'react'
import { Treatment, Form } from '@/types/database'
import { AddTreatmentDialog } from './add-treatment-dialog'
import { EditTreatmentDialog } from './edit-treatment-dialog'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface TreatmentsListProps {
  treatments: (Treatment & { treatment_forms: { forms: { id: string, title: string } | null }[] })[]
  forms: Pick<Form, 'id' | 'title'>[]
}

export function TreatmentsList({ treatments, forms }: TreatmentsListProps) {
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  const handleDelete = async (id: string) => {
    try {
      setIsDeleting(id)
      const { error } = await supabase.from('treatments').delete().eq('id', id)
      if (error) throw error
      toast.success('Zabieg został usunięty')
      router.refresh()
    } catch (error) {
      toast.error('Nie udało się usunąć zabiegu')
      console.error(error)
    } finally {
      setIsDeleting(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <AddTreatmentDialog forms={forms} />
      </div>

      <div className="grid gap-4">
        {treatments.map((treatment) => (
          <div
            key={treatment.id}
            className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm"
          >
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {treatment.name}
              </h3>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {treatment.duration_minutes} min
                </span>
                {treatment.price && (
                  <span className="flex items-center gap-1 font-medium text-gray-900 dark:text-white">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {treatment.price} PLN
                  </span>
                )}
              </div>
              {treatment.treatment_forms && treatment.treatment_forms.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {treatment.treatment_forms.map((tf, idx) => (
                    tf.forms && (
                      <div key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-50 dark:bg-purple-900/20 text-xs font-medium text-purple-700 dark:text-purple-300">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 011.414.586l5.414 5.414a1 1 0 01.586 1.414V19a2 2 0 01-2 2z" />
                        </svg>
                        {tf.forms.title}
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <EditTreatmentDialog treatment={treatment as any} forms={forms} />
              <button
                onClick={() => handleDelete(treatment.id)}
                disabled={isDeleting === treatment.id}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Usuń zabieg"
              >
                {isDeleting === treatment.id ? (
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        ))}

        {treatments.length === 0 && (
          <div className="text-center py-12 text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Brak zabiegów</h3>
            <p className="max-w-sm mx-auto mt-1">
              Dodaj pierwszy zabieg do swojej oferty, aby móc umawiać wizyty.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
