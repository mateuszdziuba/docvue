import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PublicFormClient } from '@/components/public-form-client'

interface Props {
  params: Promise<{ formId: string }>
}

export default async function PublicFormPage({ params }: Props) {
  const { formId } = await params
  const supabase = await createClient()
  
  const { data: form, error } = await supabase
    .from('forms')
    .select('*')
    .eq('id', formId)
    .eq('is_public', true)
    .eq('is_active', true)
    .single()

  if (error || !form) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-xl p-8 border border-white/20">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 mb-4">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {form.title}
            </h1>
            {form.description && (
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {form.description}
              </p>
            )}
          </div>

          {/* Form */}
          <PublicFormClient form={form} />
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-400 mt-6">
          Powered by Beauty Docs
        </p>
      </div>
    </div>
  )
}
