'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FormRenderer } from '@/components/form-renderer'
import { submitClientForm } from '@/actions/client-forms'
import type { Form } from '@/types/database'

interface TokenFormClientProps {
  token: string
  form: Form
  clientName?: string
  filledBy: 'client' | 'staff'
}

export function TokenFormClient({ token, form, clientName, filledBy }: TokenFormClientProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (formData: Record<string, unknown>) => {
    setIsSubmitting(true)
    setError(null)

    // Find signature field logic
    const fields = (form.schema as any)?.fields || []
    const signatureField = fields.find((f: any) => f.type === 'signature' || f.type === 'Signature')
    const signatureValue = signatureField ? formData[signatureField.name] : formData.signature

    const result = await submitClientForm({
      token,
      formData,
      filledBy,
      signature: signatureValue as string || undefined,
    })

    if (result.error) {
      setError(result.error)
      setIsSubmitting(false)
      return
    }

    router.push(`/f/${token}/success`)
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
