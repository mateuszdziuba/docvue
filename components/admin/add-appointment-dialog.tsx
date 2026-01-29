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
import { Treatment } from '@/types/database'
import { format, addMinutes } from 'date-fns'

import { ClientCombobox } from '@/components/admin/client-combobox'

interface AddAppointmentDialogProps {
  clientId?: string
  salonId: string
  trigger?: React.ReactNode
}

export function AddAppointmentDialog({ clientId, salonId, trigger }: AddAppointmentDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(clientId)
  
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    setSelectedClientId(clientId)
  }, [clientId, open])

  useEffect(() => {
    if (open) {
      const fetchTreatments = async () => {
        const { data } = await supabase
          .from('treatments')
          .select('*')
          .eq('salon_id', salonId)
          .order('name')
        if (data) setTreatments(data)
      }
      fetchTreatments()
    }
  }, [open, salonId, supabase])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const treatmentId = formData.get('treatment_id') as string
    const date = formData.get('date') as string
    const hour = formData.get('hour') as string
    const minute = formData.get('minute') as string
    const notes = formData.get('notes') as string

    if (!selectedClientId) {
        toast.error('Wybierz klienta')
        setIsLoading(false)
        return
    }

    if (!treatmentId || !date || !hour || !minute) {
      toast.error('Wypełnij wszystkie wymagane pola')
      setIsLoading(false)
      return
    }

    const time = `${hour}:${minute}`

    try {
      const startTime = new Date(`${date}T${time}`)
      
      // Check required forms for this treatment
      const { data: requiredForms } = await supabase
        .from('treatment_forms')
        .select('form_id')
        .eq('treatment_id', treatmentId)

      const status = (requiredForms && requiredForms.length > 0) ? 'pending_forms' : 'scheduled'

      const { error } = await supabase.from('appointments').insert({
        salon_id: salonId,
        client_id: selectedClientId,
        treatment_id: treatmentId,
        start_time: startTime.toISOString(),
        status: status,
        notes: notes || null
      })

      if (error) throw error

      toast.success('Wizyta została umówiona')
      setOpen(false)
      router.refresh()
    } catch (error) {
      console.error(error)
      toast.error('Nie udało się umówić wizyty')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-gradient-to-r from-pink-500 to-purple-600 text-white">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Dodaj wizytę
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Umów wizytę</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          
          {!clientId && (
              <div className="space-y-2">
                  <label className="text-sm font-medium">Klient</label>
                  <ClientCombobox 
                    salonId={salonId} 
                    onSelect={setSelectedClientId} 
                  />
                  {!selectedClientId && <p className="text-xs text-amber-600">Proszę wybrać klienta z listy</p>}
              </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Zabieg</label>
            <select
              name="treatment_id"
              required
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            >
              <option value="">-- Wybierz zabieg --</option>
              {treatments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.duration_minutes} min) - {t.price} PLN
                </option>
              ))}
            </select>
          </div>

            <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Data</label>
              <input
                type="date"
                name="date"
                required
                defaultValue={format(new Date(), 'yyyy-MM-dd')}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Godzina</label>
              <div className="flex gap-2">
                <select 
                  name="hour" 
                  required
                  className="w-full px-2 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                >
                    {Array.from({ length: 15 }, (_, i) => i + 7).map(h => (
                        <option key={h} value={h.toString().padStart(2, '0')}>
                            {h.toString().padStart(2, '0')}
                        </option>
                    ))}
                </select>
                <span className="self-center">:</span>
                <select 
                  name="minute" 
                  required
                  className="w-full px-2 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                >
                    {Array.from({ length: 12 }, (_, i) => i * 5).map(m => (
                        <option key={m} value={m.toString().padStart(2, '0')}>
                            {m.toString().padStart(2, '0')}
                        </option>
                    ))}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Notatki (opcjonalne)</label>
            <textarea
              name="notes"
              rows={3}
              placeholder="Np. Klientka prosi o..."
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            />
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Zapisywanie...' : 'Zapisz wizytę'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
