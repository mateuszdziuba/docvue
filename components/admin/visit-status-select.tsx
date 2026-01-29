'use client'

import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export function VisitStatusSelect({ id, currentStatus }: { id: string, currentStatus: string }) {
  const supabase = createClient()
  const router = useRouter()

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', id)

      if (error) throw error
      toast.success('Status zaktualizowany')
      router.refresh()
    } catch (error) {
      toast.error('Błąd aktualizacji statusu')
    }
  }

  return (
    <select
      value={currentStatus}
      onChange={handleChange}
      className={`
        px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 font-medium
        ${currentStatus === 'completed' ? 'bg-green-50 text-green-700 border-green-200' : ''}
        ${currentStatus === 'cancelled' ? 'bg-red-50 text-red-700 border-red-200' : ''}
        ${currentStatus === 'pending_forms' ? 'bg-orange-50 text-orange-700 border-orange-200' : ''}
        ${currentStatus === 'scheduled' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
      `}
    >
      <option value="scheduled">Zaplanowana</option>
      <option value="pending_forms">Wymaga ankiety</option>
      <option value="completed">Zakończona</option>
      <option value="cancelled">Odwołana</option>
    </select>
  )
}
