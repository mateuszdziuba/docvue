'use client'

import React, { useState, useEffect } from 'react'
import { useRouterCompat } from '@/lib/router-compat'
import { Reorder } from 'framer-motion'
import { toast } from 'sonner'
import { updateForm, deleteForm } from '@/src/server/forms'
import { checkFormUsage } from '@/src/server/form-usage'
import type { FormField } from '@/types/database'

// Icon wrapper with a tinted background pill — used in the field type buttons
function FieldIcon({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg ${color}`}>
      {children}
    </span>
  )
}

const fieldTypes = [
  {
    type: 'text',
    label: 'Krótka odpowiedź',
    icon: (
      <FieldIcon color="bg-primary-container text-primary dark:bg-primary/20 dark:text-primary">
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
      <FieldIcon color="bg-secondary text-secondary-foreground dark:bg-secondary/30 dark:text-secondary-foreground">
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
      <FieldIcon color="bg-accent text-accent-foreground dark:bg-accent/30 dark:text-accent-foreground">
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
      <FieldIcon color="bg-primary-container text-primary dark:bg-primary/20 dark:text-primary">
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
      <FieldIcon color="bg-secondary text-secondary-foreground dark:bg-secondary/30 dark:text-secondary-foreground">
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
      <FieldIcon color="bg-accent text-accent-foreground dark:bg-accent/30 dark:text-accent-foreground">
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
      <FieldIcon color="bg-primary-container text-primary dark:bg-primary/20 dark:text-primary">
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
      <FieldIcon color="bg-secondary text-secondary-foreground dark:bg-secondary/30 dark:text-secondary-foreground">
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
      <FieldIcon color="bg-muted text-muted-foreground dark:bg-muted/50 dark:text-muted-foreground">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14"/><path d="M5 7h4"/><path d="M15 7h4"/>
        </svg>
      </FieldIcon>
    ),
  },
]

interface EditFormClientProps {
  form: {
    id: string
    title: string
    description: string | null
    schema: { fields: FormField[] }
    is_public: boolean
    is_active: boolean
  }
}

export default function EditFormClient({ form }: EditFormClientProps) {
  const router = useRouterCompat()
  const [title, setTitle] = useState(form.title)
  const [description, setDescription] = useState(form.description || '')
  const [fields, setFields] = useState<FormField[]>(form.schema?.fields || [])
  const [isSaving, setIsSaving] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [expandedField, setExpandedField] = useState<number | null>(null)

  useEffect(() => {
    const checkUsage = async () => {
      const result = await checkFormUsage(form.id)
      if (result.isUsed) {
        setIsLocked(true)
      }
    }
    checkUsage()
  }, [form.id])

  const addField = (type: string) => {
    const newField: FormField = {
      name: `field_${Date.now()}`,
      label: '',
      type,
      placeholder: '',
      required: false,
    }
    setFields([...fields, newField])
    setExpandedField(fields.length)
  }

  const updateField = (index: number, updates: Partial<FormField>) => {
    const newFields = [...fields]
    newFields[index] = { ...newFields[index], ...updates }
    setFields(newFields)
  }

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index))
    if (expandedField === index) setExpandedField(null)
  }

  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const toggleExpand = (index: number) => {
    setExpandedField(expandedField === index ? null : index)
  }

  const handleDeleteForm = async () => {
    setIsDeleting(true)
    const result = await deleteForm(form.id)

    if (result.error) {
      toast.error(result.error)
      setIsDeleting(false)
      setShowDeleteModal(false)
      return
    }

    toast.success('Formularz został usunięty')
    router.push('/dashboard/forms')
  }

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Podaj tytuł formularza')
      return
    }

    if (fields.length === 0) {
      toast.error('Dodaj przynajmniej jedno pole')
      return
    }

    const invalidField = fields.find(f => !f.label.trim())
    if (invalidField) {
      toast.error('Wszystkie pola muszą mieć etykiety')
      const index = fields.indexOf(invalidField)
      setExpandedField(index)
      return
    }

    setIsSaving(true)

    const cleanedFields = isLocked
      ? form.schema?.fields || []  // keep original fields if locked
      : fields.map(f => ({
          ...f,
          label: f.label.trim(),
          options: f.options?.filter(o => o.label.trim()).map(o => ({ ...o, label: o.label.trim() }))
        }))

    const result = await updateForm(form.id, {
      title: title.trim(),
      description: description.trim() || undefined,
      schema: { fields: cleanedFields },
    })

    if (result.error) {
      toast.error(result.error)
      setIsSaving(false)
      return
    }

    toast.success('Formularz został zaktualizowany')
    router.push('/dashboard/forms')
    router.refresh()
  }

  const inputClasses = "w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Edytuj formularz</h1>
            <p className="text-muted-foreground mt-1">
              Zmień szczegóły i pola formularza
            </p>
          </div>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2 text-destructive hover:text-destructive hover:bg-destructive/8 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Usuń formularz
          </button>
        </div>

        {/* Lock Warning */}
        {isLocked && (
          <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg flex items-start gap-3">
            <svg className="w-5 h-5 text-warning mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div>
              <h3 className="font-medium text-warning/90 text-sm">Struktura zablokowana</h3>
              <p className="text-sm text-warning/80 mt-0.5">
                Pola formularza są zablokowane po pierwszym wypełnieniu, ale możesz edytować tytuł i opis.
              </p>
            </div>
          </div>
        )}

        {/* Form Details — always editable */}
        <div className="bg-card rounded-xl p-6 border border-border/60">
          <h2 className="text-lg font-semibold text-foreground mb-4">Szczegóły formularza</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Tytuł *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="np. Zgoda na zabieg kosmetyczny"
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Opis (opcjonalnie)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Krótki opis formularza dla klienta..."
                rows={2}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Field Types */}
        <div className={`bg-card rounded-xl p-6 border border-border/60 ${isLocked ? 'opacity-60 pointer-events-none' : ''}`}>
          <h2 className="text-lg font-semibold text-foreground mb-4">Dodaj pola</h2>
          <div className="flex flex-wrap gap-2">
            {fieldTypes.map((ft) => (
              <button
                key={ft.type}
                onClick={() => addField(ft.type)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/70 transition-colors"
              >
                <span>{ft.icon}</span>
                <span className="text-sm font-medium">{ft.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Fields List */}
        {fields.length > 0 && (
          <div className={`bg-card rounded-xl p-6 border border-border/60 ${isLocked ? 'opacity-60 pointer-events-none' : ''}`}>
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Pola formularza
              <span className="text-sm font-normal text-muted-foreground ml-2">(przeciągnij aby zmienić kolejność)</span>
            </h2>
            <Reorder.Group axis="y" values={fields} onReorder={setFields} className="space-y-4">
              {fields.map((field, index) => {
                const isExpanded = expandedField === index
                const fieldType = fieldTypes.find(ft => ft.type === field.type)

                return (
                  <Reorder.Item
                    key={field.name}
                    value={field}
                    className={`bg-secondary/30 rounded-xl border ${field.type === 'separator' ? 'border-primary/20 bg-primary/5' : 'border-border/60'} cursor-grab active:cursor-grabbing overflow-hidden transition-all ${isExpanded ? 'p-4' : 'p-3'}`}
                    whileDrag={{
                      scale: 1.02,
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                    }}
                  >
                    <div className="flex items-start gap-4">
                      {/* Drag handle */}
                      <div className="flex flex-col items-center justify-center text-muted-foreground/50 pt-1">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
                        </svg>
                      </div>

                      {/* Field Content */}
                      <div className="flex-1">
                        {!isExpanded ? (
                          /* Collapsed View */
                          <div
                            className="flex items-center justify-between cursor-pointer group"
                            onClick={() => toggleExpand(index)}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-xl">{fieldType?.icon}</span>
                              <div>
                                <p className={`font-medium ${field.type === 'separator' ? 'text-primary' : 'text-foreground'}`}>
                                  {field.label || <span className="text-muted-foreground italic">Bez etykiety</span>}
                                </p>
                                <p className="text-xs text-muted-foreground">{fieldType?.label}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  removeField(index)
                                }}
                                className="p-1 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                                title="Usuń pole"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                              <button className="text-muted-foreground group-hover:text-primary transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Expanded View */
                          <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>{fieldType?.icon}</span>
                                <span>{fieldType?.label}</span>
                              </div>
                              <button onClick={() => toggleExpand(index)} className="text-xs text-muted-foreground hover:text-foreground uppercase font-medium">
                                Zwiń
                              </button>
                            </div>

                            {field.type === 'separator' ? (
                              <textarea
                                value={field.label}
                                onChange={(e) => updateField(index, { label: e.target.value })}
                                placeholder="Treść separatora / opisu"
                                rows={3}
                                className={`${inputClasses} font-mono`}
                              />
                            ) : (
                              <>
                                <input
                                  type="text"
                                  value={field.label}
                                  onChange={(e) => updateField(index, { label: e.target.value })}
                                  onPointerDown={(e) => e.stopPropagation()}
                                  placeholder="Pytanie (np. Czy chorujesz na cukrzycę?)"
                                  className={inputClasses}
                                />

                                {field.type !== 'date' && (
                                  <input
                                    type="text"
                                    value={field.placeholder || ''}
                                    onChange={(e) => updateField(index, { placeholder: e.target.value })}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    placeholder="Placeholder (opcjonalnie)"
                                    className={inputClasses}
                                  />
                                )}
                              </>
                            )}

                            {(field.type === 'select' || field.type === 'radio' || field.type === 'checkbox_group') && (
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">Opcje wyboru (każda w nowej linii):</p>
                                <textarea
                                  placeholder="Opcja 1&#10;Opcja 2&#10;Opcja 3"
                                  value={field.options?.map(o => o.label).join('\n') || ''}
                                  onChange={(e) => {
                                    const opts = e.target.value.split('\n').map(line => ({
                                      label: line,
                                      value: line.trim().toLowerCase().replace(/\s+/g, '_')
                                    }))
                                    updateField(index, { options: opts })
                                  }}
                                  onPointerDown={(e) => e.stopPropagation()}
                                  rows={4}
                                  className={`${inputClasses} font-mono`}
                                />
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-2">
                              {field.type !== 'separator' && (
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={field.required || false}
                                    onChange={(e) => updateField(index, { required: e.target.checked })}
                                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary/30"
                                  />
                                  <span className="text-sm text-muted-foreground">Pole wymagane</span>
                                </label>
                              )}
                              <button
                                onClick={() => removeField(index)}
                                className="text-muted-foreground hover:text-destructive transition-colors text-sm flex items-center gap-1 ml-auto"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Usuń pole
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Reorder.Item>
                )
              })}
            </Reorder.Group>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end gap-4">
          <button
            onClick={() => router.back()}
            className="px-6 py-3 text-muted-foreground hover:text-foreground font-medium transition-colors"
          >
            Anuluj
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-8 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Zapisywanie...' : 'Zapisz zmiany'}
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-destructive/10 rounded-full">
                  <svg className="w-6 h-6 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Usuń formularz</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Czy na pewno chcesz usunąć ten formularz?
                  </p>
                </div>
              </div>

              <div className="bg-destructive/8 border border-destructive/20 rounded-xl p-4 mb-6">
                <p className="text-sm text-destructive font-medium flex gap-2">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Ta operacja jest nieodwracalna. Usunięte zostaną również wszystkie odpowiedzi klientów powiązane z tym formularzem.
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                  className="px-4 py-2 text-muted-foreground hover:text-foreground font-medium disabled:opacity-50"
                  type="button"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleDeleteForm}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-medium rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                  type="button"
                >
                  {isDeleting ? 'Usuwanie...' : 'Usuń formularz'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
