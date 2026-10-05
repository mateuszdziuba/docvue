'use client'

import { Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { useRouterCompat } from '@/lib/router-compat'
import { createClient } from '@/lib/supabase/client'
import type { Form } from '@/types/database'

export function AddTreatmentDialog({ forms }: { forms: Pick<Form, 'id' | 'title'>[] }) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedFormIds, setSelectedFormIds] = useState<string[]>([])
  const [formSearch, setFormSearch] = useState('')
  const supabase = createClient()

  const filteredForms = forms.filter((form) =>
    form.title.toLowerCase().includes(formSearch.trim().toLowerCase()),
  )
  const router = useRouterCompat()

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setSelectedFormIds([])
      setFormSearch('')
    }
    setOpen(next)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const duration = parseInt(formData.get('duration') as string, 10)
    const price = parseFloat(formData.get('price') as string)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: salon } = await supabase
        .from('salons')
        .select('id')
        .eq('user_id', user.id)
        .single()
      if (!salon) throw new Error('No salon found')

      const { data: treatment, error: treatmentError } = await supabase
        .from('treatments')
        .insert({
          salon_id: salon.id,
          name,
          description,
          duration_minutes: duration,
          price,
        })
        .select()
        .single()

      if (treatmentError) throw treatmentError

      // Insert required forms
      const formIds = selectedFormIds
      if (formIds.length > 0) {
        const { error: formsError } = await supabase.from('treatment_forms').insert(
          formIds.map((fid) => ({
            treatment_id: treatment.id,
            form_id: fid,
          })),
        )
        if (formsError) throw formsError
      }

      toast.success('Dodano nowy zabieg')
      setSelectedFormIds([])
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Dodaj zabieg
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Dodaj nowy zabieg</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="treatment-name" className="text-sm font-medium text-foreground">
              Nazwa zabiegu
            </Label>
            <Input
              id="treatment-name"
              name="name"
              required
              placeholder="np. Konsultacja dermatologiczna"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="treatment-description" className="text-sm font-medium text-foreground">
              Opis (opcjonalnie)
            </Label>
            <Textarea
              id="treatment-description"
              name="description"
              rows={3}
              placeholder="Krótki opis zabiegu..."
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="treatment-duration" className="text-sm font-medium text-foreground">
                Domyślny czas (min)
              </Label>
              <Input
                id="treatment-duration"
                name="duration"
                type="number"
                defaultValue={60}
                required
                min={5}
                step={5}
              />
              <p className="text-xs text-muted-foreground">Można zmienić przy tworzeniu wizyty</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="treatment-price" className="text-sm font-medium text-foreground">
                Cena (PLN)
              </Label>
              <Input
                id="treatment-price"
                name="price"
                type="number"
                step="0.01"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">Wymagane formularze</Label>
            <Input
              type="search"
              value={formSearch}
              onChange={(event) => setFormSearch(event.target.value)}
              placeholder="Szukaj formularza…"
              aria-label="Szukaj formularza"
            />
            <ScrollArea className="h-40 rounded-lg border border-border">
              <div className="space-y-3 p-3">
                {forms.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Brak dostępnych formularzy.</p>
                ) : filteredForms.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Brak pasujących formularzy.</p>
                ) : (
                  filteredForms.map((form) => (
                    <div key={form.id} className="flex min-h-11 items-center gap-2 md:min-h-0">
                      <Checkbox
                        id={`form-${form.id}`}
                        checked={selectedFormIds.includes(form.id)}
                        onCheckedChange={(checked) =>
                          setSelectedFormIds((previous) =>
                            checked === true
                              ? [...previous, form.id]
                              : previous.filter((id) => id !== form.id),
                          )
                        }
                      />
                      <Label
                        htmlFor={`form-${form.id}`}
                        className="cursor-pointer text-sm font-normal text-foreground"
                      >
                        {form.title}
                      </Label>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
            <p className="text-xs text-muted-foreground">
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
