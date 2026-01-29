'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
]

export default function NewFormPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [fields, setFields] = useState<FormField[]>([])
  const [isPublic, setIsPublic] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addField = (type: string) => {
    const newField: FormField = {
      name: `field_${Date.now()}`,
      label: '',
      type,
      placeholder: '',
      required: false,
    }
    setFields([...fields, newField])
  }

  const updateField = (index: number, updates: Partial<FormField>) => {
    const newFields = [...fields]
    newFields[index] = { ...newFields[index], ...updates }
    setFields(newFields)
  }

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index))
  }

  const moveField = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === fields.length - 1) return
    
    const newFields = [...fields]
    const newIndex = direction === 'up' ? index - 1 : index + 1
    ;[newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]]
    setFields(newFields)
  }

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Podaj tytuł formularza')
      return
    }

    if (fields.length === 0) {
      setError('Dodaj przynajmniej jedno pole')
      return
    }

    // Validate all fields have labels
    const invalidField = fields.find(f => !f.label.trim())
    if (invalidField) {
      setError('Wszystkie pola muszą mieć etykietę')
      return
    }

    setIsSaving(true)
    setError(null)

    const result = await createForm({
      title,
      description,
      schema: { fields },
      is_public: isPublic,
    })

    if (result.error) {
      setError(result.error)
      setIsSaving(false)
      return
    }

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

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

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

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="text-gray-700 dark:text-gray-300">Formularz publiczny (dostępny dla klientów)</span>
          </label>
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
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Pola formularza</h2>
          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.name} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
                <div className="flex items-start gap-4">
                  {/* Move buttons */}
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => moveField(index, 'up')}
                      disabled={index === 0}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => moveField(index, 'down')}
                      disabled={index === fields.length - 1}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    >
                      ▼
                    </button>
                  </div>

                  {/* Field config */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <span>{fieldTypes.find(ft => ft.type === field.type)?.icon}</span>
                      <span>{fieldTypes.find(ft => ft.type === field.type)?.label}</span>
                    </div>
                    
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

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.required || false}
                        onChange={(e) => updateField(index, { required: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Pole wymagane</span>
                    </label>
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={() => removeField(index)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
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
