'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface DeleteBeautyPlanButtonProps {
  planId: string
}

export function DeleteBeautyPlanButton({ planId }: DeleteBeautyPlanButtonProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const handleDelete = async () => {
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('beauty_plans')
        .delete()
        .eq('id', planId)

      if (error) throw error

      toast.success('Beauty Plan został usunięty')
      setOpen(false)
      router.refresh()
    } catch (error: any) {
      console.error('Error deleting beauty plan:', error)
      toast.error('Nie udało się usunąć planu. Upewnij się, że masz uprawnienia.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="px-3 py-1.5 bg-destructive/10 hover:bg-destructive/20 text-destructive text-sm font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer">
          <Trash2 className="w-4 h-4" />
          Usuń
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Usuwanie Beauty Planu
          </DialogTitle>
          <DialogDescription>
            Czy na pewno chcesz trwale usunąć ten Beauty Plan? 
            Znikną wszystkie wskazówki i przypisane kosmetyki. 
            Tej operacji nie można cofnąć!
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Anuluj
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Tak, usuń plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
