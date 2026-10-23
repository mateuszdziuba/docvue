'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  FACE_CATEGORY_OPTIONS,
  FACE_REGION_OPTIONS,
  FACE_SEVERITY_OPTIONS,
} from '@/lib/consultation'
import { colorForCategory, FACE_COLOR_CLASSES } from '@/lib/face'
import type {
  FaceAnnotation,
  FaceAnnotationCategory,
  FaceRegion,
  FaceSeverity,
} from '@/types/consultation'

export type AnnotationDraft = Pick<
  FaceAnnotation,
  'category' | 'severity' | 'region' | 'label' | 'description'
>

export function FaceAnnotationDialog({
  open,
  onOpenChange,
  initial,
  suggestedRegion,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial: FaceAnnotation | null
  suggestedRegion: FaceRegion
  onSave: (draft: AnnotationDraft) => void
}) {
  const [category, setCategory] = useState<FaceAnnotationCategory>('lesion')
  const [severity, setSeverity] = useState<FaceSeverity>('mild')
  const [region, setRegion] = useState<FaceRegion>(suggestedRegion)
  const [label, setLabel] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (!open) return
    setCategory(initial?.category ?? 'lesion')
    setSeverity(initial?.severity ?? 'mild')
    setRegion(initial?.region ?? suggestedRegion)
    setLabel(initial?.label ?? '')
    setDescription(initial?.description ?? '')
  }, [open, initial, suggestedRegion])

  const color = colorForCategory(category)

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    onSave({
      category,
      severity,
      region,
      label: label.trim(),
      description: description.trim(),
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl font-normal">
            {initial ? 'Edytuj obserwację' : 'Nowa obserwacja'}
          </DialogTitle>
          <DialogDescription>
            Opisz zmianę skórną. Numer i pozycję na twarzy zapisujemy automatycznie.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-surface-container-low/60 px-3 py-2 text-sm">
            <span
              className={`h-3 w-3 rounded-full border ${FACE_COLOR_CLASSES[color]}`}
              aria-hidden="true"
            />
            <span className="text-muted-foreground">
              Kolor na mapie:{' '}
              {FACE_CATEGORY_OPTIONS.find((option) => option.value === category)?.label}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="annotation-category">Rodzaj zmiany</Label>
              <Select
                value={category}
                onValueChange={(value) => setCategory(value as FaceAnnotationCategory)}
              >
                <SelectTrigger
                  id="annotation-category"
                  aria-label="Rodzaj zmiany"
                  className="h-11 rounded-xl border-input bg-background"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FACE_CATEGORY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="annotation-severity">Nasilenie</Label>
              <Select
                value={severity}
                onValueChange={(value) => setSeverity(value as FaceSeverity)}
              >
                <SelectTrigger
                  id="annotation-severity"
                  aria-label="Nasilenie"
                  className="h-11 rounded-xl border-input bg-background"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FACE_SEVERITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="annotation-region">Region twarzy</Label>
            <Select value={region} onValueChange={(value) => setRegion(value as FaceRegion)}>
              <SelectTrigger
                id="annotation-region"
                aria-label="Region twarzy"
                className="h-11 rounded-xl border-input bg-background"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FACE_REGION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="annotation-label">Krótka nazwa (opcjonalnie)</Label>
            <Input
              id="annotation-label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Np. zaczerwienienie przy skrzydle nosa"
              maxLength={200}
              className="h-11 rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="annotation-description">Opis / komentarz</Label>
            <Textarea
              id="annotation-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Np. rumień po demakijażu, do obserwacji przy kolejnej wizycie…"
              rows={4}
              maxLength={3000}
              className="rounded-xl"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Anuluj
            </Button>
            <Button type="submit">{initial ? 'Zapisz zmiany' : 'Dodaj obserwację'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
