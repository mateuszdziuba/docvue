'use client'

import { format } from 'date-fns'
import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ClientCombobox } from '@/components/admin/client-combobox'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useRouterCompat } from '@/lib/router-compat'
import { createClient } from '@/lib/supabase/client'
import type { Treatment } from '@/types/database'

interface AddAppointmentDialogProps {
  clientId?: string
  salonId?: string
  trigger?: React.ReactNode
}

export function AddAppointmentDialog({ clientId, salonId, trigger }: AddAppointmentDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(clientId)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [resolvedSalonId, setResolvedSalonId] = useState<string | undefined>(salonId)
  const [treatmentId, setTreatmentId] = useState('')
  const [staff, setStaff] = useState<{ id: string; name: string }[]>([])
  const [staffId, setStaffId] = useState('')
  const [hour, setHour] = useState('07')
  const [minute, setMinute] = useState('00')

  const supabase = createClient()
  const router = useRouterCompat()

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setTreatmentId('')
      setStaffId('')
      setHour('07')
      setMinute('00')
    }
    setOpen(next)
  }

  useEffect(() => {
    setSelectedClientId(clientId)
  }, [clientId])

  useEffect(() => {
    setResolvedSalonId(salonId)
  }, [salonId])

  useEffect(() => {
    if (open) {
      const fetchTreatments = async () => {
        let activeSalonId = resolvedSalonId
        if (!activeSalonId) {
          const {
            data: { user },
          } = await supabase.auth.getUser()
          if (user) {
            const { data: salon } = await supabase
              .from('salons')
              .select('id')
              .eq('user_id', user.id)
              .single()
            activeSalonId = salon?.id
            setResolvedSalonId(activeSalonId)
          }
        }

        if (!activeSalonId) return

        const [{ data: treatmentsData }, { data: staffData }] = await Promise.all([
          supabase.from('treatments').select('*').eq('salon_id', activeSalonId).order('name'),
          supabase
            .from('staff_members')
            .select('id, name')
            .eq('salon_id', activeSalonId)
            .eq('is_active', true)
            .order('name'),
        ])
        if (treatmentsData) setTreatments(treatmentsData)
        if (staffData) setStaff(staffData)
      }
      fetchTreatments()
    }
  }, [open, resolvedSalonId, supabase])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const notes = formData.get('notes') as string

    if (!selectedClientId) {
      toast.error('Wybierz klienta')
      setIsLoading(false)
      return
    }

    if (!treatmentId || !selectedDate || !hour || !minute) {
      toast.error('Wypełnij wszystkie wymagane pola')
      setIsLoading(false)
      return
    }

    if (!resolvedSalonId) {
      toast.error('Nie znaleziono salonu')
      setIsLoading(false)
      return
    }

    const time = `${hour}:${minute}`

    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const startTime = new Date(`${dateStr}T${time}`)

      // Check required forms for this treatment
      const { data: requiredForms } = await supabase
        .from('treatment_forms')
        .select('form_id')
        .eq('treatment_id', treatmentId)

      const requiredFormIds = requiredForms?.map((r) => r.form_id) || []

      let status = 'scheduled'

      if (requiredFormIds.length > 0) {
        // Check if client has already submitted these forms (either via link or public)
        const { data: clientSubmissions } = await supabase
          .from('submissions')
          .select('form_id')
          .eq('client_id', selectedClientId)
          .in('form_id', requiredFormIds)

        const submittedFormIds = clientSubmissions?.map((s) => s.form_id) || []
        const submittedSet = new Set(submittedFormIds)

        const allRequirementsMet = requiredFormIds.every((id) => submittedSet.has(id))

        if (!allRequirementsMet) {
          status = 'pending_forms'
        }
      }

      const { error } = await supabase.from('appointments').insert({
        salon_id: resolvedSalonId,
        client_id: selectedClientId,
        treatment_id: treatmentId,
        staff_id: staffId || null,
        start_time: startTime.toISOString(),
        status: status,
        notes: notes || null,
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
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
              <Label htmlFor="client_id" className="text-sm font-medium">
                Klient
              </Label>
              <ClientCombobox
                id="client_id"
                salonId={resolvedSalonId ?? ''}
                onSelect={setSelectedClientId}
                invalid={!selectedClientId}
                describedBy={!selectedClientId ? 'client_id-hint' : undefined}
              />
              {!selectedClientId && (
                <p id="client_id-hint" className="text-xs text-on-warning-container">
                  Proszę wybrać klienta z listy
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="treatment_id" className="text-sm font-medium">
              Zabieg
            </Label>
            <Combobox
              id="treatment_id"
              options={treatments.map((t) => ({
                value: t.id,
                label: t.name,
                hint: `${t.duration_minutes} min · ${t.price} PLN`,
              }))}
              value={treatmentId}
              onChange={setTreatmentId}
              placeholder="Wybierz zabieg…"
              searchPlaceholder="Szukaj zabiegu…"
              emptyText="Brak zabiegów."
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="staff_id" className="text-sm font-medium">
              Wykonawca zabiegu
            </Label>
            <Select
              value={staffId || 'none'}
              onValueChange={(value) => setStaffId(value === 'none' ? '' : value)}
            >
              <SelectTrigger id="staff_id" className="w-full">
                <SelectValue placeholder="-- Wybierz osobę --" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-- Nieprzypisany --</SelectItem>
                {staff.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="appointment_date" className="text-sm font-medium">
                Data
              </Label>
              <DatePicker
                id="appointment_date"
                date={selectedDate}
                setDate={setSelectedDate}
                placeholder="Wybierz datę"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hour" className="text-sm font-medium">
                Godzina
              </Label>
              <div className="flex gap-2">
                <Select value={hour} onValueChange={setHour}>
                  <SelectTrigger id="hour" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 15 }, (_, i) => i + 7).map((h) => (
                      <SelectItem key={h} value={h.toString().padStart(2, '0')}>
                        {h.toString().padStart(2, '0')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="self-center">:</span>
                <Select value={minute} onValueChange={setMinute}>
                  <SelectTrigger aria-label="Minuty" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => (
                      <SelectItem key={m} value={m.toString().padStart(2, '0')}>
                        {m.toString().padStart(2, '0')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Notatki (opcjonalne)
            </Label>
            <Textarea id="notes" name="notes" rows={3} placeholder="Np. Klientka prosi o..." />
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
