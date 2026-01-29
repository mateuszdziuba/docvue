'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FormRenderer } from '@/components/form-renderer'
import { submitForm } from '@/actions/submissions'
import type { Form } from '@/types/database'

interface PublicFormClientProps {
  form: Form
}

export function PublicFormClient({ form }: PublicFormClientProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (formData: Record<string, unknown>) => {
    setIsSubmitting(true)
    setError(null)

    const result = await submitForm({
      formId: form.id,
      formData,
      clientName: formData.name as string || formData.imie as string || undefined,
      clientEmail: formData.email as string || undefined,
    })

    if (result.error) {
      setError(result.error)
      setIsSubmitting(false)
      return
    }

    router.push(`/f/${form.id}/success`)
  }

  return (
    <>
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
      <FormRenderer
        form={form}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </>
  )
}
