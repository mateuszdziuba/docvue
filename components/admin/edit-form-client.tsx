'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Reorder } from 'framer-motion'
import { toast } from 'sonner'
import { updateForm, deleteForm } from '@/actions/forms'
import { checkFormUsage } from '@/actions/form-usage'
import type { FormField } from '@/types/database'

const fieldTypes = [
  { type: 'text', label: 'Tekst', icon: '📝' },
  { type: 'email', label: 'Email', icon: '✉️' },
  { type: 'tel', label: 'Telefon', icon: '📱' },
  { type: 'textarea', label: 'Długi tekst', icon: '📄' },
  { type: 'select', label: 'Wybór', icon: '📋' },
  { type: 'checkbox', label: 'Checkbox', icon: '☑️' },
  { type: 'date', label: 'Data', icon: '📅' },
  { type: 'signature', label: 'Podpis', icon: '✍️' },
  { type: 'separator', label: 'Opis / Rozdzielacz', icon: '📝' },
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
  const router = useRouter()
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

    // Validate all fields have labels
    const invalidField = fields.find(f => !f.label.trim())
    if (invalidField) {
      toast.error('Wszystkie pola muszą mieć etykiety')
      const index = fields.indexOf(invalidField)
      setExpandedField(index)
      return
    }

    setIsSaving(true)

    const result = await updateForm(form.id, {
      title: title.trim(),
      description: description.trim() || undefined,
      schema: { fields },
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

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edytuj formularz</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Zmień szczegóły i pola formularza
            </p>
          </div>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Usuń formularz
          </button>
        </div>

        {/* Lock Warning */}
        {isLocked && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-xl flex items-start gap-3">
            <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">Edycja zablokowana</h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                Ten formularz został już wypełniony przez klientów. Aby zachować spójność danych, nie można zmieniać jego struktury.
                Możesz go tylko usunąć (co usunie również wszystkie odpowiedzi).
              </p>
            </div>
          </div>
        )}

      {/* Error */}


      {/* Form Details */}
      <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 ${isLocked ? 'opacity-60 pointer-events-none' : ''}`}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Szczegóły formularza</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tytuł *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="np. Zgoda na zabieg kosmetyczny"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Opis (opcjonalnie)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Krótki opis formularza dla klienta..."
              rows={2}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            />
          </div>
        </div>
      </div>

      {/* Field Types */}
      <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 ${isLocked ? 'opacity-60 pointer-events-none' : ''}`}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Dodaj pola</h2>
        <div className="flex flex-wrap gap-2">
          {fieldTypes.map((ft) => (
            <button
              key={ft.type}
              onClick={() => addField(ft.type)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <span>{ft.icon}</span>
              <span className="text-sm font-medium">{ft.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Fields List */}
      {fields.length > 0 && (
        <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 ${isLocked ? 'opacity-60 pointer-events-none' : ''}`}>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Pola formularza
            <span className="text-sm font-normal text-gray-500 ml-2">(przeciągnij aby zmienić kolejność)</span>
          </h2>
          <Reorder.Group axis="y" values={fields} onReorder={setFields} className="space-y-4">
            {fields.map((field, index) => {
              const isExpanded = expandedField === index
              const fieldType = fieldTypes.find(ft => ft.type === field.type)
              
              return (
                <Reorder.Item 
                  key={field.name} 
                  value={field}
                  className={`bg-gray-50 dark:bg-gray-700/50 rounded-xl border ${field.type === 'separator' ? 'border-purple-200 dark:border-purple-900/50 bg-purple-50/50 dark:bg-purple-900/10' : 'border-gray-200 dark:border-gray-600'} cursor-grab active:cursor-grabbing overflow-hidden transition-all ${isExpanded ? 'p-4' : 'p-3'}`}
                  whileDrag={{ 
                    scale: 1.02, 
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                    backgroundColor: "rgba(147, 51, 234, 0.05)"
                  }}
                >
                  <div className="flex items-start gap-4">
                    {/* Drag handle */}
                    <div className="flex flex-col items-center justify-center text-gray-400 pt-1">
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
                              <p className={`font-medium ${field.type === 'separator' ? 'text-purple-600 dark:text-purple-400' : 'text-gray-900 dark:text-white'}`}>
                                {field.label || <span className="text-gray-400 italic">Bez etykiety</span>}
                              </p>
                              <p className="text-xs text-gray-500">{fieldType?.label}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                             <button 
                              onClick={(e) => {
                                e.stopPropagation()
                                removeField(index)
                              }}
                              className="p-1 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                              title="Usuń pole"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                            <button className="text-gray-400 group-hover:text-purple-600 transition-colors">
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
                             <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                <span>{fieldType?.icon}</span>
                                <span>{fieldType?.label}</span>
                             </div>
                             <button onClick={() => toggleExpand(index)} className="text-xs text-gray-400 hover:text-gray-600 uppercase font-medium">
                               Zwiń
                             </button>
                          </div>
                          
                          {field.type === 'separator' ? (
                            <textarea
                              value={field.label}
                              onChange={(e) => updateField(index, { label: e.target.value })}
                              placeholder="Treść separatora / opisu (HTML dozwolony)"
                              rows={3}
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono"
                            />
                          ) : (
                            <>
                              <input
                                type="text"
                                value={field.label}
                                onChange={(e) => updateField(index, { label: e.target.value })}
                                placeholder="Etykieta pola (np. Imię i nazwisko)"
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                              />
                              
                              <input
                                type="text"
                                value={field.placeholder || ''}
                                onChange={(e) => updateField(index, { placeholder: e.target.value })}
                                placeholder="Placeholder (opcjonalnie)"
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                              />
                            </>
                          )}

                          {(field.type === 'select' || field.type === 'radio') && (
                            <textarea
                              placeholder="Opcje (każda w nowej linii)"
                              value={field.options?.map(o => o.label).join('\n') || ''}
                              onChange={(e) => {
                                const opts = e.target.value.split('\n').map(line => ({
                                  label: line.trim(),
                                  value: line.trim().toLowerCase().replace(/\s+/g, '_')
                                })).filter(o => o.label)
                                updateField(index, { options: opts })
                              }}
                              rows={3}
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                            />
                          )}

                          <div className="flex items-center justify-between pt-2">
                            {field.type !== 'separator' && (
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={field.required || false}
                                  onChange={(e) => updateField(index, { required: e.target.checked })}
                                  className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                />
                                <span className="text-sm text-gray-600 dark:text-gray-400">Pole wymagane</span>
                              </label>
                            )}
                            <button
                              onClick={() => removeField(index)}
                              className="text-gray-400 hover:text-red-600 transition-colors text-sm flex items-center gap-1 ml-auto"
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
          className="px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium"
        >
          Anuluj
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving || isLocked}
          className="px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLocked ? 'Edycja zablokowana' : (isSaving ? 'Zapisywanie...' : 'Zapisz zmiany')}
        </button>
      </div>
    </div>
  )
}
