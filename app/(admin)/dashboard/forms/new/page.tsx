'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Reorder } from 'framer-motion'
import { toast } from 'sonner'
import { createForm } from '@/actions/forms'
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

export default function NewFormPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [fields, setFields] = useState<FormField[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [expandedField, setExpandedField] = useState<number | null>(null)

  const addField = (type: string) => {
    const newField: FormField = {
      name: `field_${Date.now()}`,
      label: '',
      type,
      placeholder: '',
      required: false,
    }
    setFields([...fields, newField])
    setExpandedField(fields.length) // Auto-expand new field
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

  const toggleExpand = (index: number) => {
    setExpandedField(expandedField === index ? null : index)
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
      toast.error('Wszystkie pola muszą mieć etykietę')
      // Auto-expand the first invalid field
      const index = fields.indexOf(invalidField)
      setExpandedField(index)
      return
    }

    setIsSaving(true)

    const result = await createForm({
      title,
      description,
      schema: { fields },
    })

    if (result.error) {
      toast.error(result.error)
      setIsSaving(false)
      return
    }

    toast.success('Formularz został utworzony')
    router.push('/dashboard/forms')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Nowy formularz</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Stwórz nowy formularz dla swoich klientów
        </p>
      </div>

      {/* Form Details */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
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

      {/* Add Field Buttons */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Dodaj pola</h2>
        <div className="flex flex-wrap gap-2">
          {fieldTypes.map((ft) => (
            <button
              key={ft.type}
              onClick={() => addField(ft.type)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            >
              <span>{ft.icon}</span>
              {ft.label}
            </button>
          ))}
        </div>
      </div>

      {/* Fields List */}
      {fields.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
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
                  className={`bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 cursor-grab active:cursor-grabbing overflow-hidden transition-all ${isExpanded ? 'p-4' : 'p-3'}`}
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
                          className="flex items-center justify-between cursor-pointer"
                          onClick={() => toggleExpand(index)}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{fieldType?.icon}</span>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {field.label || <span className="text-gray-400 italic">Bez etykiety</span>}
                              </p>
                              <p className="text-xs text-gray-500">{fieldType?.label}</p>
                            </div>
                          </div>
                          <button className="text-gray-400 hover:text-purple-600 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
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
          disabled={isSaving}
          className="px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-medium rounded-xl hover:from-pink-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
        >
          {isSaving ? 'Zapisywanie...' : 'Zapisz formularz'}
        </button>
      </div>
    </div>
  )
}
