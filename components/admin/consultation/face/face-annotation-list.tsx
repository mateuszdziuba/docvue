'use client'

import { Pencil, Plus, ScanFace, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FACE_SEVERITY_OPTIONS } from '@/lib/consultation'
import {
  colorForCategory,
  FACE_COLOR_CLASSES,
  faceCategoryLabel,
  faceRegionLabel,
} from '@/lib/face'
import type { FaceAnnotation } from '@/types/consultation'

export function FaceAnnotationList({
  annotations,
  selectedId,
  disabled,
  onSelect,
  onEdit,
  onDelete,
  onAdd,
}: {
  annotations: FaceAnnotation[]
  selectedId: string | null
  disabled?: boolean
  onSelect: (id: string) => void
  onEdit: (annotation: FaceAnnotation) => void
  onDelete: (annotation: FaceAnnotation) => void
  onAdd: () => void
}) {
  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-border/60 bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
        <div>
          <p className="label-caps text-muted-foreground">Obserwacje</p>
          <p className="mt-0.5 text-sm font-medium text-foreground">
            {annotations.length} {annotations.length === 1 ? 'wpis' : 'wpisów'}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onAdd}
          disabled={disabled}
          className="shrink-0"
        >
          <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
          Dodaj
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {annotations.length === 0 ? (
          <div className="flex h-full min-h-40 flex-col items-center justify-center px-4 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-container-low text-muted-foreground">
              <ScanFace className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="mt-2 text-sm font-medium text-foreground">Brak obserwacji</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Kliknij na twarzy w trybie „Punkt” albo dodaj wpis ręcznie z wyborem regionu.
            </p>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {annotations.map((annotation) => {
              const color = colorForCategory(annotation.category)
              const severity =
                FACE_SEVERITY_OPTIONS.find((option) => option.value === annotation.severity)
                  ?.label ?? ''
              return (
                <li key={annotation.id}>
                  <div
                    className={`group flex items-start gap-2 rounded-xl border px-2.5 py-2 transition-colors ${
                      selectedId === annotation.id
                        ? 'border-primary/40 bg-primary-container/40'
                        : 'border-transparent hover:bg-surface-container-low'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(annotation.id)}
                      className="flex min-w-0 flex-1 items-start gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${FACE_COLOR_CLASSES[color]}`}
                        aria-hidden="true"
                      >
                        {annotation.number}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {annotation.label || faceCategoryLabel(annotation.category)}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-muted-foreground">
                          {faceRegionLabel(annotation.region)} · {severity}
                          {annotation.description ? ` · ${annotation.description}` : ''}
                        </span>
                      </span>
                    </button>
                    <div className="flex shrink-0 items-center">
                      <button
                        type="button"
                        onClick={() => onEdit(annotation)}
                        disabled={disabled}
                        aria-label={`Edytuj obserwację ${annotation.number}`}
                        className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(annotation)}
                        disabled={disabled}
                        aria-label={`Usuń obserwację ${annotation.number}`}
                        className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
