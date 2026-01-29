'use client'

import { useState } from 'react'
import { createClientAction } from '@/actions/clients'
import { DatePicker } from "@/components/ui/date-picker"

interface AddClientFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export function AddClientForm({ onSuccess, onCancel }: AddClientFormProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('+48 ')
  const [birthDate, setBirthDate] = useState<Date | undefined>(undefined)
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      setError('Imię i nazwisko jest wymagane')
      return
    }

    if (!phone.trim() || phone.trim() === '+48') {
      setError('Numer telefonu jest wymagany')
      return
    }

    setIsSubmitting(true)
    setError(null)

    const result = await createClientAction({
      name: name.trim(),
      email: email.trim() || undefined,
      phone: phone.trim(),
      birth_date: birthDate ? birthDate.toISOString() : undefined,
      notes: notes.trim() || undefined,
    })

    if (result.error) {
      setError(result.error)
      setIsSubmitting(false)
      return
    }

    // Reset form
    setName('')
    setEmail('')
    setPhone('+48 ')
    setBirthDate(undefined)
    setNotes('')
    setIsSubmitting(false)
    
    onSuccess?.()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}
      
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Imię i nazwisko *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Anna Kowalska"
            className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Telefon *
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+48 123 456 789"
            className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email (opcjonalnie)
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="anna@example.com"
            className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Data urodzenia
          </label>
          <DatePicker 
            date={birthDate} 
            setDate={setBirthDate} 
            placeholder="Wybierz datę urodzenia" 
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Notatki
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Dodatkowe informacje o kliencie..."
          rows={2}
          className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            Anuluj
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-medium rounded-lg transition-all disabled:opacity-50"
        >
          {isSubmitting ? 'Dodawanie...' : 'Dodaj klienta'}
        </button>
      </div>
    </form>
  )
}
