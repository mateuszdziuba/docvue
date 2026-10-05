'use client'

import { Loader2, Trash2 } from 'lucide-react'
import { useState } from 'react'
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
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

interface DeleteBeautyPlanButtonProps {
  onConfirm: () => Promise<{ error?: string }>
}

export function DeleteBeautyPlanButton({ onConfirm }: DeleteBeautyPlanButtonProps) {
  const [open, setOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    setIsDeleting(true)
    try {
      const result = await onConfirm()
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Plan pielęgnacyjny został usunięty')
      setOpen(false)
    } catch {
      toast.error('Nie udało się usunąć planu. Spróbuj ponownie.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="destructive" size="sm" aria-label="Usuń plan pielęgnacyjny">
          <Trash2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Usuń
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Usunąć plan pielęgnacyjny?</AlertDialogTitle>
          <AlertDialogDescription>
            Plan pielęgnacyjny tego klienta zostanie trwale usunięty wraz ze wszystkimi produktami.
            Tej operacji nie można cofnąć.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Anuluj</AlertDialogCancel>
          <AlertDialogAction
            aria-label="Potwierdź usunięcie planu pielęgnacyjnego"
            disabled={isDeleting}
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isDeleting ? 'Usuwanie...' : 'Usuń plan'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
