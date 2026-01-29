'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button 
          className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200 dark:bg-red-900/10 dark:text-red-400 dark:border-red-900/30"
          disabled={isDeleting}
        >
          {isDeleting ? 'Usuwanie...' : 'Usuń wizytę'}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Czy na pewno chcesz usunąć tę wizytę?</DialogTitle>
          <DialogDescription>
            Tej operacji nie można cofnąć. Wizyta zostanie trwale usunięta z bazy danych wraz z powiązanymi zdjęciami.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <button 
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Anuluj
          </button>
          <button 
            onClick={handleDelete} 
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            disabled={isDeleting}
          >
            {isDeleting ? 'Usuwanie...' : 'Usuń wizytę'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
