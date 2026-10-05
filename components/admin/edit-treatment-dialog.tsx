'use client'

import { Pencil } from 'lucide-react'
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
import type { Form, Treatment } from '@/types/database'

interface EditTreatmentDialogProps {
  treatment: Treatment & { treatment_forms: { forms: { id: string } | null }[] }
  forms: Pick<Form, 'id' | 'title'>[]
}

export function EditTreatmentDialog({ treatment, forms }: EditTreatmentDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()
  const router = useRouterCompat()

  const defaultFormIds = treatment.treatment_forms
    .map((tf) => tf.forms?.id)
    .filter(Boolean) as string[]

  const [selectedFormIds, setSelectedFormIds] = useState<string[]>(defaultFormIds)
  const [formSearch, setFormSearch] = useState('')

  const filteredForms = forms.filter((form) =>
    form.title.toLowerCase().includes(formSearch.trim().toLowerCase()),
  )

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setSelectedFormIds(defaultFormIds)
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

    // Get selected form IDs
    const formIds = selectedFormIds

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
        const { error: insertError } = await supabase.from('treatment_forms').insert(
          formIds.map((fid) => ({
            treatment_id: treatment.id,
            form_id: fid,
          })),
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary"
          title="Edytuj zabieg"
          aria-label="Edytuj zabieg"
        >
          <Pencil className="h-5 w-5" aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edytuj zabieg</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="edit-treatment-name" className="text-sm font-medium text-foreground">
              Nazwa zabiegu
            </Label>
            <Input
              id="edit-treatment-name"
              name="name"
              required
              defaultValue={treatment.name}
              placeholder="np. Konsultacja dermatologiczna"
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="edit-treatment-description"
              className="text-sm font-medium text-foreground"
            >
              Opis (opcjonalnie)
            </Label>
            <Textarea
              id="edit-treatment-description"
              name="description"
              rows={3}
              defaultValue={treatment.description || ''}
              placeholder="Krótki opis zabiegu..."
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label
                htmlFor="edit-treatment-duration"
                className="text-sm font-medium text-foreground"
              >
                Domyślny czas (min)
              </Label>
              <Input
                id="edit-treatment-duration"
                name="duration"
                type="number"
                defaultValue={treatment.duration_minutes}
                required
                min={5}
                step={5}
              />
              <p className="text-xs text-muted-foreground">Można zmienić przy tworzeniu wizyty</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-treatment-price" className="text-sm font-medium text-foreground">
                Cena (PLN)
              </Label>
              <Input
                id="edit-treatment-price"
                name="price"
                type="number"
                step="0.01"
                defaultValue={treatment.price || ''}
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
                        id={`edit-form-${form.id}`}
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
                        htmlFor={`edit-form-${form.id}`}
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
              {isLoading ? 'Zapisywanie...' : 'Zaktualizuj zabieg'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
