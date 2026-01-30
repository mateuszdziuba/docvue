'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Form, Treatment } from '@/types/database'
import { Pencil } from 'lucide-react'

interface EditTreatmentDialogProps {
  treatment: Treatment & { treatment_forms: { forms: { id: string } | null }[] }
  forms: Pick<Form, 'id' | 'title'>[]
}

export function EditTreatmentDialog({ treatment, forms }: EditTreatmentDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const defaultFormIds = treatment.treatment_forms
    .map(tf => tf.forms?.id)
    .filter(Boolean) as string[]

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const duration = parseInt(formData.get('duration') as string)
    const price = parseFloat(formData.get('price') as string)
    
    // Get selected form IDs
    const formIds = formData.getAll('form_ids') as string[]

    try {
      // 1. Update Treatment details
      const { error: updateError } = await supabase
        .from('treatments')
        .update({
          name,
          description,
          duration_minutes: duration,
          price,
        })
        .eq('id', treatment.id)

      if (updateError) throw updateError

      // 2. Update Relations (Delete all old, Insert new)
      // Note: A smarter way would be diffing, but delete-all-insert is simpler for small lists.
      
      // Delete existing
      const { error: deleteError } = await supabase
        .from('treatment_forms')
        .delete()
        .eq('treatment_id', treatment.id)
      
      if (deleteError) throw deleteError

      // Insert new
      if (formIds.length > 0) {
        const { error: insertError } = await supabase
          .from('treatment_forms')
          .insert(
            formIds.map(fid => ({
               treatment_id: treatment.id,
               form_id: fid
            }))
          )
        if (insertError) throw insertError
      }

      toast.success('Zabieg został zaktualizowany')
      setOpen(false)
      router.refresh()
    } catch (error) {
      toast.error('Błąd podczas aktualizacji zabiegu')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
          title="Edytuj zabieg"
        >
          <Pencil className="w-5 h-5" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edytuj zabieg</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Nazwa zabiegu
            </label>
            <input
              name="name"
              required
              defaultValue={treatment.name}
              placeholder="np. Konsultacja dermatologiczna"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Opis (opcjonalnie)
            </label>
            <textarea
              name="description"
              rows={3}
              defaultValue={treatment.description || ''}
              placeholder="Krótki opis zabiegu..."
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Czas trwania (min)
              </label>
              <input
                name="duration"
                type="number"
                defaultValue={treatment.duration_minutes}
                required
                min={1}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Cena (PLN)
              </label>
              <input
                name="price"
                type="number"
                step="0.01"
                defaultValue={treatment.price || ''}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Wymagane formularze
            </label>
            <div className="space-y-2 border border-gray-200 dark:border-gray-700 rounded-lg p-3 max-h-40 overflow-y-auto">
              {forms.length === 0 ? (
                <p className="text-sm text-gray-500">Brak dostępnych formularzy.</p>
              ) : (
                forms.map((form) => (
                  <div key={form.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="form_ids"
                      value={form.id}
                      id={`edit-form-${form.id}`}
                      defaultChecked={defaultFormIds.includes(form.id)}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <label htmlFor={`edit-form-${form.id}`} className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                      {form.title}
                    </label>
                  </div>
                ))
              )}
            </div>
            <p className="text-xs text-gray-500">
              Zaznacz formularze, które klient musi wypełnić przed wizytą.
            </p>
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
              {isLoading ? 'Zapisywanie...' : 'Zaktualizuj zabieg'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
