import React from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Reorder } from 'framer-motion'
import { toast } from 'sonner'
import { createFormFn } from '@/src/server/forms'
import type { FormField } from '@/types/database'

export const Route = createFileRoute('/_authed/dashboard/forms/new')({
  beforeLoad: ({ context }) => {
    if (!(context as { isOwner?: boolean }).isOwner) {
      throw redirect({ to: '/dashboard/forms' })
    }
  },
  component: NewFormPage,
})

function FieldIcon({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg shrink-0 ${color}`}>
      {children}
    </span>
  )
}

const fieldTypes = [
  {
    type: 'text',
    label: 'Krótka odpowiedź',
    icon: (
      <FieldIcon color="bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/>
        </svg>
      </FieldIcon>
    ),
  },
  {
    type: 'textarea',
    label: 'Długa odpowiedź',
    icon: (
      <FieldIcon color="bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="11" x2="21" y2="11"/><line x1="3" y1="16" x2="14" y2="16"/>
        </svg>
      </FieldIcon>
    ),
  },
  {
    type: 'select',
    label: 'Lista rozwijana',
    icon: (
      <FieldIcon color="bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h16"/><path d="M4 12h10"/><path d="M14 17l3 3 3-3"/>
        </svg>
      </FieldIcon>
    ),
  },
  {
    type: 'radio',
    label: 'Jednokrotny wybór',
    icon: (
      <FieldIcon color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none"/>
        </svg>
      </FieldIcon>
    ),
  },
  {
    type: 'checkbox_group',
    label: 'Wielokrotny wybór',
    icon: (
      <FieldIcon color="bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="3"/><polyline points="8 12 11 15 16 9"/>
        </svg>
      </FieldIcon>
    ),
  },
  {
    type: 'date',
    label: 'Data',
    icon: (
      <FieldIcon color="bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
        </svg>
      </FieldIcon>
    ),
  },
  {
    type: 'email',
    label: 'Email',
    icon: (
      <FieldIcon color="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/>
        </svg>
      </FieldIcon>
    ),
  },
  {
    type: 'tel',
    label: 'Telefon',
    icon: (
      <FieldIcon color="bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
        </svg>
      </FieldIcon>
    ),
  },
  {
    type: 'separator',
    label: 'Opis / Rozdzielacz',
    icon: (
      <FieldIcon color="bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14"/><path d="M5 7h4"/><path d="M15 7h4"/>
        </svg>
      </FieldIcon>
    ),
  },
]

function createField(type: string): FormField {
  const baseField: FormField = {
    name: `field_${Date.now()}`,
    label: '',
    type,
    required: false,
  }
  if (['select', 'radio', 'checkbox_group'].includes(type)) {
    baseField.options = [{ label: 'Opcja 1', value: 'option_1' }]
  }
  return baseField
}

function NewFormPage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [fields, setFields] = useState<FormField[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [expandedField, setExpandedField] = useState<number | null>(null)

  async function handleSave() {
    if (!title.trim()) {
      toast.error('Podaj tytuł formularza')
      return
    }
    setIsSaving(true)
    const result = await createFormFn({
      data: { title, description, schema: { fields } },
    })
    setIsSaving(false)
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success('Formularz zapisany')
      navigate({ to: '/dashboard/forms' })
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-normal text-foreground tracking-tight">Nowy formularz</h1>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {isSaving ? 'Zapisywanie…' : 'Zapisz formularz'}
        </button>
      </div>

      <div className="bg-card rounded-lg border border-border p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Tytuł
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            placeholder="np. Formularz zgody na zabieg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Opis <span className="text-muted-foreground">(opcjonalnie)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
            placeholder="Krótki opis formularza"
          />
        </div>
      </div>

      {/* Field type selector */}
      <div className="bg-card rounded-lg border border-border p-5">
        <p className="text-sm font-medium text-foreground mb-3">Dodaj pole</p>
        <div className="grid grid-cols-3 gap-2">
          {fieldTypes.map((ft) => (
            <button
              key={ft.type}
              onClick={() => setFields([...fields, createField(ft.type)])}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border hover:bg-secondary hover:border-border/80 text-sm text-foreground transition-colors text-left"
            >
              {ft.icon}
              <span className="truncate text-[13px] font-medium">{ft.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Fields list */}
      {fields.length > 0 && (
        <Reorder.Group
          axis="y"
          values={fields}
          onReorder={setFields}
          className="space-y-3"
        >
          {fields.map((field, index) => (
            <Reorder.Item key={field.name} value={field}>
              <FieldEditor
                field={field}
                index={index}
                isExpanded={expandedField === index}
                onToggle={() =>
                  setExpandedField(expandedField === index ? null : index)
                }
                onChange={(updated) => {
                  const newFields = [...fields]
                  newFields[index] = updated
                  setFields(newFields)
                }}
                onDelete={() => {
                  setFields(fields.filter((_, i) => i !== index))
                  if (expandedField === index) setExpandedField(null)
                }}
              />
            </Reorder.Item>
          ))}
        </Reorder.Group>
      )}
    </div>
  )
}

function FieldEditor({
  field,
  index,
  isExpanded,
  onToggle,
  onChange,
  onDelete,
}: {
  field: FormField
  index: number
  isExpanded: boolean
  onToggle: () => void
  onChange: (f: FormField) => void
  onDelete: () => void
}) {
  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-secondary/50"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground">⠿</span>
          <span className="text-sm font-medium text-foreground">
            {field.label || (
              <span className="text-muted-foreground italic">
                Brak etykiety
              </span>
            )}
          </span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {field.type}
          </span>
          {field.required && (
            <span className="text-xs text-primary">wymagane</span>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="text-muted-foreground hover:text-destructive p-1 rounded"
        >
          ✕
        </button>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Etykieta
            </label>
            <input
              type="text"
              value={field.label}
              onChange={(e) => onChange({ ...field, label: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="np. Imię i nazwisko"
            />
          </div>
          {field.type !== 'separator' && (
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={field.required ?? false}
                onChange={(e) =>
                  onChange({ ...field, required: e.target.checked })
                }
                className="rounded border-border"
              />
              Pole wymagane
            </label>
          )}
          {['select', 'radio', 'checkbox_group'].includes(field.type) && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Opcje (jedna na linię)
              </label>
              <textarea
                rows={3}
                value={(field.options ?? []).map((o) => o.label).join('\n')}
                onChange={(e) => {
                  const lines = e.target.value.split('\n')
                  onChange({
                    ...field,
                    options: lines.map((l, i) => ({
                      label: l,
                      value: `option_${i + 1}`,
                    })),
                  })
                }}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
