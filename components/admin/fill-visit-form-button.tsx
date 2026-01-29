'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { assignFormToClient } from '@/actions/client-forms'
import { toast } from 'sonner'
import { Button } from "@/components/ui/button"

interface FillVisitFormButtonProps {
  clientId: string
  formId: string
  formTitle: string
}

export function FillVisitFormButton({ clientId, formId, formTitle }: FillVisitFormButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleFill = async () => {
    try {
      setIsLoading(true)
      
      const result = await assignFormToClient({ clientId, formId })
      
      if (result.error) {
        toast.error(result.error)
        return
      }

      if (result.token) {
        // Retrieve Token and Redirect
        router.push(`/dashboard/clients/${clientId}/fill/${result.token}`)
      }
    } catch (error) {
      toast.error('Wystąpił błąd')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleFill} 
      disabled={isLoading}
      className="ml-auto"
    >
      {isLoading ? 'Ładowanie...' : 'Wypełnij teraz'}
    </Button>
  )
}
