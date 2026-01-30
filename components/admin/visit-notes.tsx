'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

// Using a "Zapisz" button for clarity instead of debounce

export function VisitNotes({ id, initialNotes }: { id: string, initialNotes: string | null }) {
  const [notes, setNotes] = useState(initialNotes || '')
  const [isSaving, setIsSaving] = useState(false)
  const supabase = createClient()

  const handleSave = async () => {
    try {
      setIsSaving(true)
      const { error } = await supabase
        .from('appointments')
        .update({ notes })
        .eq('id', id)

      if (error) throw error
      toast.success('Notatki zapisane')
    } catch (error) {
      toast.error('Błąd zapisu')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <textarea
        className="w-full min-h-[150px] p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 resize-y"
        placeholder="Wpisz przebieg wizyty, użyte produkty, uwagi..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
        >
          {isSaving ? 'Zapisywanie...' : 'Zapisz notatki'}
        </button>
      </div>
    </div>
  )
}
