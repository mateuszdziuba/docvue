'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface DeleteVisitButtonProps {
  visitId: string
}

export function DeleteVisitButton({ visitId }: DeleteVisitButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', visitId)

      if (error) throw error

      toast.success('Wizyta została usunięta')
      setIsOpen(false)
      router.push('/dashboard')
      router.refresh()
    } catch (error) {
      console.error(error)
      toast.error('Nie udało się usunąć wizyty')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <button 
          className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200 dark:bg-red-900/10 dark:text-red-400 dark:border-red-900/30"
          disabled={isDeleting}
        >
          {isDeleting ? 'Usuwanie...' : 'Usuń wizytę'}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Czy na pewno chcesz usunąć tę wizytę?</AlertDialogTitle>
          <AlertDialogDescription>
            Tej operacji nie można cofnąć. Wizyta zostanie trwale usunięta z bazy danych wraz z powiązanymi zdjęciami.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Anuluj</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete} 
            className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700 focus:ring-red-600"
            disabled={isDeleting}
          >
            {isDeleting ? 'Usuwanie...' : 'Usuń wizytę'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
