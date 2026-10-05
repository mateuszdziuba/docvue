'use client'

import { useBlocker, useNavigate } from '@tanstack/react-router'
import { Reorder, useDragControls } from 'framer-motion'
import {
  AlignLeft,
  ArrowDown,
  ArrowUp,
  Calendar,
  Check,
  CheckSquare,
  ChevronDown,
  CircleDot,
  Eye,
  FileText,
  GripVertical,
  Hash,
  Info,
  Lock,
  Mail,
  Minus,
  Phone,
  Plus,
  Trash2,
  Type,
} from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'
import { DeleteIconButton } from '@/components/admin/delete-icon-button'
import { SalonTokensToolbar } from '@/components/admin/salon-tokens-toolbar'
import { FormRenderer } from '@/components/form-renderer'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { normalizeFieldType, uniqueOptionValue } from '@/lib/form-validation'
import { cn } from '@/lib/utils'
import { createFormFn, deleteFormFn, updateFormFn } from '@/src/server/forms'
import type { Form, FormField } from '@/types/database'

const OPTION_TYPES = new Set(['select', 'radio', 'checkbox_group'])

const FIELD_TYPES: Array<{
  type: string
  label: string
  icon: React.ReactNode
  iconClass: string
}> = [
  {
    type: 'text',
    label: 'Krótka odpowiedź',
    icon: <Type className="h-3.5 w-3.5" aria-hidden="true" />,
    iconClass: 'bg-primary-container text-primary',
  },
  {
    type: 'textarea',
    label: 'Długa odpowiedź',
    icon: <AlignLeft className="h-3.5 w-3.5" aria-hidden="true" />,
    iconClass: 'bg-secondary text-secondary-foreground',
  },
  {
    type: 'select',
    label: 'Lista rozwijana',
    icon: <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />,
    iconClass: 'bg-accent text-accent-foreground',
  },
  {
    type: 'radio',
    label: 'Jednokrotny wybór',
    icon: <CircleDot className="h-3.5 w-3.5" aria-hidden="true" />,
    iconClass: 'bg-primary-container text-primary',
  },
  {
    type: 'checkbox_group',
    label: 'Wielokrotny wybór',
    icon: <CheckSquare className="h-3.5 w-3.5" aria-hidden="true" />,
    iconClass: 'bg-secondary text-secondary-foreground',
  },
  {
    type: 'checkbox',
    label: 'Pojedyncza zgoda',
    icon: <Check className="h-3.5 w-3.5" aria-hidden="true" />,
    iconClass: 'bg-primary-container text-primary',
  },
  {
    type: 'date',
    label: 'Data',
    icon: <Calendar className="h-3.5 w-3.5" aria-hidden="true" />,
    iconClass: 'bg-accent text-accent-foreground',
  },
  {
    type: 'email',
    label: 'Email',
    icon: <Mail className="h-3.5 w-3.5" aria-hidden="true" />,
    iconClass: 'bg-primary-container text-primary',
  },
  {
    type: 'tel',
    label: 'Telefon',
    icon: <Phone className="h-3.5 w-3.5" aria-hidden="true" />,
    iconClass: 'bg-secondary text-secondary-foreground',
  },
  {
    type: 'number',
    label: 'Pole liczbowe',
    icon: <Hash className="h-3.5 w-3.5" aria-hidden="true" />,
    iconClass: 'bg-accent text-accent-foreground',
  },
  {
    type: 'separator',
    label: 'Opis / Rozdzielacz',
    icon: <Minus className="h-3.5 w-3.5" aria-hidden="true" />,
    iconClass: 'bg-muted text-muted-foreground',
  },
  {
    type: 'info',
    label: 'Sekcja informacyjna',
    icon: <Info className="h-3.5 w-3.5" aria-hidden="true" />,
    iconClass: 'bg-muted text-muted-foreground',
  },
]

function fieldNoun(count: number): string {
  if (count === 1) return 'pole'
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return 'pola'
  return 'pól'
}

function cleanField(field: FormField): FormField {
  const cleaned: FormField = { ...field, label: field.label.trim() }
  if (field.placeholder !== undefined) {
    cleaned.placeholder = field.placeholder.trim() || undefined
  }
  if (field.description !== undefined) {
    cleaned.description = field.description.trim() || undefined
  }
  if (field.options) {
    cleaned.options = field.options
      .map((option) => ({ label: option.label.trim(), value: option.value }))
      .filter((option) => option.label.length > 0)
  }
  return cleaned
}

interface FormBuilderProps {
  mode: 'create' | 'edit'
  formId?: string
  initialTitle?: string
  initialDescription?: string | null
  initialSchema?: FormField[]
  isLocked?: boolean
  usageCount?: number
}

export function FormBuilder({
  mode,
  formId,
  initialTitle = '',
  initialDescription = '',
  initialSchema = [],
  isLocked = false,
  usageCount = 0,
}: FormBuilderProps) {
  const navigate = useNavigate()
  const uid = React.useId()
  const [title, setTitle] = React.useState(initialTitle)
  const [description, setDescription] = React.useState(initialDescription ?? '')
  const [fields, setFields] = React.useState<FormField[]>(initialSchema)
  const [expandedField, setExpandedField] = React.useState<number | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
  const [showPreview, setShowPreview] = React.useState(false)
  const [liveMessage, setLiveMessage] = React.useState('')
  const [initialSnapshot] = React.useState(() =>
    JSON.stringify({
      title: initialTitle,
      description: initialDescription ?? '',
      fields: initialSchema,
    }),
  )
  const fieldCounter = React.useRef(0)
  const bypassBlocker = React.useRef(false)

  const currentSnapshot = JSON.stringify({ title, description, fields })
  const isDirty = currentSnapshot !== initialSnapshot

  const blocker = useBlocker({
    shouldBlockFn: () => isDirty && !bypassBlocker.current,
    withResolver: true,
    disabled: !isDirty,
  })

  React.useEffect(() => {
    if (!isDirty) return
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  const updateField = (index: number, updates: Partial<FormField>) => {
    setFields((previous) => {
      const next = [...previous]
      next[index] = { ...next[index], ...updates }
      return next
    })
  }

  const addField = (type: string) => {
    fieldCounter.current += 1
    const newField: FormField = {
      name: `field_${Date.now().toString(36)}_${fieldCounter.current}`,
      label: '',
      type,
      required: false,
    }
    if (OPTION_TYPES.has(type)) {
      newField.options = [{ label: 'Opcja 1', value: 'option_1' }]
    }
    setFields((previous) => [...previous, newField])
    setExpandedField(fields.length)
  }

  const removeField = (index: number) => {
    setFields((previous) => previous.filter((_, itemIndex) => itemIndex !== index))
    setExpandedField((previous) => {
      if (previous === null) return null
      if (previous === index) return null
      return previous > index ? previous - 1 : previous
    })
  }

  const moveField = (index: number, direction: -1 | 1) => {
    if (isLocked) return
    const target = index + direction
    if (target < 0 || target >= fields.length) return

    setFields((previous) => {
      const next = [...previous]
      const [item] = next.splice(index, 1)
      next.splice(target, 0, item)
      return next
    })
    setExpandedField((previous) => {
      if (previous === index) return target
      if (previous === target) return index
      return previous
    })
    setLiveMessage(`Pole przeniesione na pozycję ${target + 1} z ${fields.length}`)
  }

  const handleSave = async () => {
    if (isSaving) return
    if (!title.trim()) {
      toast.error('Podaj tytuł formularza')
      return
    }
    if (mode === 'create' && fields.length === 0) {
      toast.error('Dodaj przynajmniej jedno pole')
      return
    }
    if (!isLocked) {
      const invalidIndex = fields.findIndex((field) => !field.label.trim())
      if (invalidIndex !== -1) {
        toast.error('Wszystkie pola muszą mieć etykiety')
        setExpandedField(invalidIndex)
        return
      }
    }

    const cleanedFields = isLocked ? undefined : fields.map(cleanField)
    setIsSaving(true)

    try {
      const result =
        mode === 'create'
          ? await createFormFn({
              data: {
                title: title.trim(),
                description: description.trim() || undefined,
                schema: { fields: cleanedFields ?? [] },
              },
            })
          : await updateFormFn({
              data: {
                id: formId as string,
                title: title.trim(),
                description: description.trim() || undefined,
                ...(cleanedFields ? { schema: { fields: cleanedFields } } : {}),
              },
            })

      if (result && 'error' in result && result.error) {
        toast.error(result.error)
        return
      }

      toast.success(mode === 'create' ? 'Formularz zapisany' : 'Formularz został zaktualizowany')
      bypassBlocker.current = true
      navigate({ to: '/dashboard/forms' })
    } catch {
      toast.error('Nie udało się zapisać formularza. Spróbuj ponownie.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!formId || isDeleting) return
    setIsDeleting(true)
    try {
      const result = await deleteFormFn({ data: { id: formId } })
      if (result && 'error' in result && result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Formularz został usunięty')
      bypassBlocker.current = true
      navigate({ to: '/dashboard/forms' })
    } catch {
      toast.error('Nie udało się usunąć formularza. Spróbuj ponownie.')
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const previewForm: Form = {
    id: formId ?? 'preview',
    salon_id: '',
    title: title.trim() || 'Bez tytułu',
    description: description.trim() || null,
    schema: { fields },
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  return (
    <>
      <p role="status" aria-live="polite" className="sr-only">
        {liveMessage}
      </p>

      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl font-normal tracking-tight text-foreground">
              {mode === 'create' ? 'Nowy formularz' : 'Edytuj formularz'}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === 'create'
                ? 'Zbuduj formularz zgody lub ankiety dla klientów'
                : 'Zmień szczegóły i pola formularza'}
            </p>
          </div>
          {mode === 'edit' && (
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
              Usuń formularz
            </Button>
          )}
        </div>

        {isLocked && (
          <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning-container p-4 text-on-warning-container">
            <Lock className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <h2 className="text-sm font-semibold">Struktura zablokowana</h2>
              <p className="mt-0.5 text-sm">
                {usageCount > 0
                  ? `Formularz ma już ${usageCount} ${
                      usageCount === 1 ? 'odpowiedź' : 'odpowiedzi'
                    }. `
                  : ''}
                Pola formularza są zablokowane po pierwszym wypełnieniu, ale możesz edytować tytuł i
                opis.
              </p>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-border/60 bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Szczegóły formularza</h2>
          <div className="space-y-4">
            <div>
              <Label
                htmlFor={`${uid}-title`}
                className="mb-1.5 text-sm font-medium text-foreground"
              >
                Tytuł <span className="text-destructive">*</span>
              </Label>
              <Input
                id={`${uid}-title`}
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="np. Zgoda na zabieg kosmetyczny"
                className="h-auto rounded-xl px-4 py-3"
              />
            </div>
            <div>
              <Label
                htmlFor={`${uid}-description`}
                className="mb-1.5 text-sm font-medium text-foreground"
              >
                Opis (opcjonalnie)
              </Label>
              <Textarea
                id={`${uid}-description`}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Krótki opis formularza dla klienta..."
                rows={2}
                className="rounded-xl px-4 py-3"
              />
              <div className="mt-2">
                <SalonTokensToolbar
                  inputId={`${uid}-description`}
                  value={description}
                  onChange={setDescription}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-foreground">Pola formularza</h2>
            <span className="text-sm text-muted-foreground">
              {fields.length} {fieldNoun(fields.length)}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLocked
              ? 'Struktura pól jest zablokowana.'
              : 'Zmień kolejność strzałkami lub przeciągnij pole za uchwyt.'}
          </p>

          {fields.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Brak pól. Dodaj pierwsze pole poniżej.
            </p>
          ) : (
            <Reorder.Group
              axis="y"
              values={fields}
              onReorder={(next) => {
                if (!isLocked) setFields(next)
              }}
              className="mt-4 space-y-3"
            >
              {fields.map((field, index) => (
                <FieldCard
                  key={field.name}
                  uid={uid}
                  field={field}
                  index={index}
                  total={fields.length}
                  isExpanded={expandedField === index}
                  isLocked={isLocked}
                  onToggle={() => setExpandedField(expandedField === index ? null : index)}
                  onChange={(updated) => updateField(index, updated)}
                  onDelete={() => removeField(index)}
                  onMoveUp={() => moveField(index, -1)}
                  onMoveDown={() => moveField(index, 1)}
                />
              ))}
            </Reorder.Group>
          )}

          <div className="mt-6 border-t border-border/60 pt-4">
            <p className="mb-3 text-sm font-medium text-foreground">Dodaj pole</p>
            <div className="flex flex-wrap gap-2">
              {FIELD_TYPES.map((fieldType) => (
                <Button
                  key={fieldType.type}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addField(fieldType.type)}
                  disabled={isLocked}
                  aria-disabled={isLocked}
                  className="min-h-11 gap-2 px-3 md:min-h-0"
                >
                  <span
                    className={cn(
                      'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                      fieldType.iconClass,
                    )}
                  >
                    {fieldType.icon}
                  </span>
                  {fieldType.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 -mx-6 mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background/95 px-6 py-4 backdrop-blur md:bottom-0">
        <p className="text-sm text-muted-foreground">
          {isSaving
            ? 'Zapisywanie...'
            : isDirty
              ? 'Niezapisane zmiany'
              : isLocked
                ? 'Struktura pól zablokowana'
                : 'Wszystkie zmiany zapisane'}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: '/dashboard/forms' })}
          >
            Anuluj
          </Button>
          <Button type="button" variant="outline" onClick={() => setShowPreview(true)}>
            <Eye className="mr-2 h-4 w-4" aria-hidden="true" />
            Podgląd
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Zapisywanie...' : mode === 'create' ? 'Zapisz formularz' : 'Zapisz zmiany'}
          </Button>
        </div>
      </div>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Podgląd formularza</DialogTitle>
          </DialogHeader>
          {fields.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Dodaj pola, aby zobaczyć podgląd formularza.
            </p>
          ) : (
            <FormRenderer form={previewForm} onSubmit={() => undefined} readOnly />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usuń formularz</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć ten formularz? Ta operacja jest nieodwracalna. Usunięte
              zostaną również wszystkie odpowiedzi klientów powiązane z tym formularzem.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault()
                void handleDelete()
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Usuwanie...' : 'Usuń formularz'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={blocker.status === 'blocked'}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Niezapisane zmiany</AlertDialogTitle>
            <AlertDialogDescription>
              Masz niezapisane zmiany. Czy na pewno chcesz opuścić stronę? Zmiany zostaną utracone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => blocker.reset?.()}>Zostań</AlertDialogCancel>
            <AlertDialogAction onClick={() => blocker.proceed?.()}>Opuść stronę</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

interface FieldCardProps {
  uid: string
  field: FormField
  index: number
  total: number
  isExpanded: boolean
  isLocked: boolean
  onToggle: () => void
  onChange: (field: FormField) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}

function FieldCard({
  uid,
  field,
  index,
  total,
  isExpanded,
  isLocked,
  onToggle,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
}: FieldCardProps) {
  const dragControls = useDragControls()
  const type = normalizeFieldType(field.type)
  const typeDefinition = FIELD_TYPES.find((fieldType) => fieldType.type === type)
  const label = field.label.trim() || 'Bez etykiety'
  const options = field.options ?? []

  const updateOptionLabel = (optionIndex: number, optionLabel: string) => {
    const next = options.map((option, itemIndex) =>
      itemIndex === optionIndex ? { ...option, label: optionLabel } : option,
    )
    onChange({ ...field, options: next })
  }

  const commitOptionValue = (optionIndex: number) => {
    const option = options[optionIndex]
    if (!option) return
    const next = options.map((item, itemIndex) =>
      itemIndex === optionIndex
        ? { ...item, value: uniqueOptionValue(item.label, options, optionIndex, optionIndex) }
        : item,
    )
    onChange({ ...field, options: next })
  }

  const addOption = () => {
    const fallbackIndex = options.length
    const optionLabel = `Opcja ${fallbackIndex + 1}`
    const value = uniqueOptionValue(optionLabel, options, -1, fallbackIndex)
    onChange({ ...field, options: [...options, { label: optionLabel, value }] })
  }

  const removeOption = (optionIndex: number) => {
    onChange({ ...field, options: options.filter((_, itemIndex) => itemIndex !== optionIndex) })
  }

  const moveOption = (optionIndex: number, direction: -1 | 1) => {
    const target = optionIndex + direction
    if (target < 0 || target >= options.length) return
    const next = [...options]
    const [item] = next.splice(optionIndex, 1)
    next.splice(target, 0, item)
    onChange({ ...field, options: next })
  }

  return (
    <Reorder.Item
      value={field}
      dragListener={false}
      dragControls={dragControls}
      className={cn(
        'overflow-hidden rounded-xl border bg-card transition-shadow',
        type === 'separator' ? 'border-primary/20 bg-primary/5' : 'border-border/60',
      )}
    >
      <div className="flex items-start gap-2 p-3">
        <button
          type="button"
          aria-label={`Przeciągnij pole „${label}"`}
          title="Przeciągnij, aby zmienić kolejność"
          onPointerDown={(event) => dragControls.start(event)}
          disabled={isLocked}
          className="mt-0.5 flex h-11 w-11 shrink-0 cursor-grab touch-none items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 sm:h-8 sm:w-8"
        >
          <GripVertical className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={isExpanded}
              className="flex min-w-0 flex-1 items-center gap-2 rounded text-left"
            >
              <span
                className={cn(
                  'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                  typeDefinition?.iconClass,
                )}
              >
                {typeDefinition?.icon ?? <FileText className="h-3.5 w-3.5" aria-hidden="true" />}
              </span>
              <span className="min-w-0">
                <span
                  className={cn(
                    'block truncate text-sm font-medium',
                    type === 'separator' ? 'text-primary' : 'text-foreground',
                  )}
                >
                  {label}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {typeDefinition?.label ?? type}
                </span>
              </span>
            </button>

            {field.required && type !== 'separator' && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                wymagane
              </span>
            )}

            <div className="ml-auto flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-11 w-11 md:h-8 md:w-8"
                onClick={onMoveUp}
                disabled={isLocked || index === 0}
                aria-label={`Przenieś pole „${label}" w górę`}
                title="W górę"
              >
                <ArrowUp className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-11 w-11 md:h-8 md:w-8"
                onClick={onMoveDown}
                disabled={isLocked || index === total - 1}
                aria-label={`Przenieś pole „${label}" w dół`}
                title="W dół"
              >
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </Button>
              <DeleteIconButton
                label={`Usuń pole „${label}"`}
                className="h-11 w-11 md:h-8 md:w-8"
                iconClassName="h-4 w-4"
                onClick={onDelete}
                disabled={isLocked}
              />
            </div>
          </div>

          {isExpanded && (
            <div className="mt-3 space-y-3 border-t border-border/60 pt-3">
              <div>
                <Label
                  htmlFor={`${uid}-label-${index}`}
                  className="mb-1 text-xs font-medium text-muted-foreground"
                >
                  {type === 'separator' ? 'Treść sekcji' : 'Etykieta'}
                </Label>
                {type === 'separator' ? (
                  <>
                    <Textarea
                      id={`${uid}-label-${index}`}
                      value={field.label}
                      onChange={(event) => onChange({ ...field, label: event.target.value })}
                      placeholder="Treść separatora / opisu"
                      rows={3}
                      disabled={isLocked}
                      className="rounded-lg"
                    />
                    <div className="mt-2">
                      <SalonTokensToolbar
                        inputId={`${uid}-label-${index}`}
                        value={field.label}
                        onChange={(value) => onChange({ ...field, label: value })}
                      />
                    </div>
                  </>
                ) : (
                  <Input
                    id={`${uid}-label-${index}`}
                    type="text"
                    value={field.label}
                    onChange={(event) => onChange({ ...field, label: event.target.value })}
                    placeholder="Pytanie (np. Czy chorujesz na cukrzycę?)"
                    disabled={isLocked}
                    className="rounded-lg"
                  />
                )}
              </div>

              {type !== 'separator' && (
                <>
                  <div>
                    <Label
                      htmlFor={`${uid}-placeholder-${index}`}
                      className="mb-1 text-xs font-medium text-muted-foreground"
                    >
                      Podpowiedź (opcjonalnie)
                    </Label>
                    <Input
                      id={`${uid}-placeholder-${index}`}
                      type="text"
                      value={field.placeholder ?? ''}
                      onChange={(event) => onChange({ ...field, placeholder: event.target.value })}
                      placeholder="np. Wpisz odpowiedź"
                      disabled={isLocked || type === 'date'}
                      className="rounded-lg"
                    />
                  </div>

                  <div>
                    <Label
                      htmlFor={`${uid}-description-${index}`}
                      className="mb-1 text-xs font-medium text-muted-foreground"
                    >
                      {type === 'info' ? 'Treść sekcji' : 'Opis pomocniczy (opcjonalnie)'}
                    </Label>
                    {type === 'info' ? (
                      <Textarea
                        id={`${uid}-description-${index}`}
                        value={field.description ?? ''}
                        onChange={(event) =>
                          onChange({ ...field, description: event.target.value })
                        }
                        placeholder="Treść informacyjna (kilka akapitów, listy z • na początku linii)"
                        rows={6}
                        disabled={isLocked}
                        className="rounded-lg"
                      />
                    ) : (
                      <Input
                        id={`${uid}-description-${index}`}
                        type="text"
                        value={field.description ?? ''}
                        onChange={(event) =>
                          onChange({ ...field, description: event.target.value })
                        }
                        placeholder="Dodatkowa informacja pod polem"
                        disabled={isLocked}
                        className="rounded-lg"
                      />
                    )}
                    <div className="mt-2">
                      <SalonTokensToolbar
                        inputId={`${uid}-description-${index}`}
                        value={field.description ?? ''}
                        onChange={(value) => onChange({ ...field, description: value })}
                      />
                    </div>
                  </div>
                </>
              )}

              {OPTION_TYPES.has(type) && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Opcje wyboru</p>
                  {options.map((option, optionIndex) => (
                    <div
                      key={`${field.name}-${option.value}`}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <Input
                        type="text"
                        value={option.label}
                        onChange={(event) => updateOptionLabel(optionIndex, event.target.value)}
                        onBlur={() => commitOptionValue(optionIndex)}
                        aria-label={`Opcja ${optionIndex + 1}`}
                        placeholder={`Opcja ${optionIndex + 1}`}
                        disabled={isLocked}
                        className="h-11 min-w-0 flex-1 rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-11 w-11 shrink-0"
                        onClick={() => moveOption(optionIndex, -1)}
                        disabled={isLocked || optionIndex === 0}
                        aria-label={`Przenieś opcję ${optionIndex + 1} w górę`}
                        title="W górę"
                      >
                        <ArrowUp className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-11 w-11 shrink-0"
                        onClick={() => moveOption(optionIndex, 1)}
                        disabled={isLocked || optionIndex === options.length - 1}
                        aria-label={`Przenieś opcję ${optionIndex + 1} w dół`}
                        title="W dół"
                      >
                        <ArrowDown className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <DeleteIconButton
                        label={`Usuń opcję ${optionIndex + 1}`}
                        className="h-11 w-11 shrink-0"
                        iconClassName="h-4 w-4"
                        onClick={() => removeOption(optionIndex)}
                        disabled={isLocked || options.length <= 1}
                      />
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addOption}
                    disabled={isLocked}
                    className="min-h-11 md:min-h-0"
                  >
                    <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                    Dodaj opcję
                  </Button>
                </div>
              )}

              {type !== 'separator' && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`${uid}-required-${index}`}
                    checked={field.required ?? false}
                    onCheckedChange={(checked) =>
                      onChange({ ...field, required: checked === true })
                    }
                    disabled={isLocked}
                  />
                  <Label
                    htmlFor={`${uid}-required-${index}`}
                    className="cursor-pointer text-sm font-normal text-muted-foreground"
                  >
                    Pole wymagane
                  </Label>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Reorder.Item>
  )
}
