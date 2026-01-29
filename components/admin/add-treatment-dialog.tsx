'use client'

import { useState } from 'react'
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
import { Form } from '@/types/database'

export function AddTreatmentDialog({ forms }: { forms: Pick<Form, 'id' | 'title'>[] }) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const duration = parseInt(formData.get('duration') as string)
    const price = parseFloat(formData.get('price') as string)
    const required_form_id = formData.get('required_form_id') as string || null

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: salon } = await supabase.from('salons').select('id').eq('user_id', user.id).single()
      if (!salon) throw new Error('No salon found')

      const { data: treatment, error: treatmentError } = await supabase.from('treatments').insert({
        salon_id: salon.id,
        name,
        description,
        duration_minutes: duration,
        price,
      }).select().single()

      if (treatmentError) throw treatmentError

      // Insert required forms
      const formIds = formData.getAll('form_ids') as string[]
      if (formIds.length > 0) {
        const { error: formsError } = await supabase.from('treatment_forms').insert(
          formIds.map(fid => ({
             treatment_id: treatment.id,
             form_id: fid
          }))
        )
        if (formsError) throw formsError
      }

      toast.success('Dodano nowy zabieg')
      setOpen(false)
      router.refresh()
    } catch (error) {
      toast.error('Błąd podczas dodawania zabiegu')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white border-0">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Dodaj zabieg
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Dodaj nowy zabieg</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Nazwa zabiegu
            </label>
            <input
              name="name"
              required
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
                defaultValue={60}
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
                      id={`form-${form.id}`}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <label htmlFor={`form-${form.id}`} className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
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
              {isLoading ? 'Zapisywanie...' : 'Zapisz zabieg'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
