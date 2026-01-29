'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface LockScreenProps {
  onUnlock: () => void
}

export function LockScreen({ onUnlock }: LockScreenProps) {
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [salonPin, setSalonPin] = useState<string | null>(null)

  useEffect(() => {
    // Fetch salon PIN on mount to verify against
    const fetchSalonPin = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('salons')
          .select('pin_code')
          .eq('user_id', user.id)
          .single()
        
        if (data) {
          setSalonPin(data.pin_code)
        }
      }
    }
    fetchSalonPin()
  }, [])

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Wait a bit for UX
    setTimeout(() => {
      if (salonPin && pin === salonPin) {
        toast.success('Odblokowano')
        onUnlock()
      } else {
        toast.error('Nieprawidłowy kod PIN')
        setPin('')
      }
      setLoading(false)
    }, 500)
  }

  return (
    <div className="fixed inset-0 z-[100] bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 text-center animate-in zoom-in-95 duration-300">
        <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Dashboard Zablokowany
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          Wprowadź kod PIN salonu, aby powrócić do panelu zarządzania.
        </p>

        <form onSubmit={handleUnlock} className="space-y-4">
          <input
            type="password"
            autoFocus
            pattern="[0-9]*"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="w-full text-center text-3xl tracking-[1em] font-mono py-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:border-purple-500 focus:ring-0 transition-all font-bold"
            placeholder="••••"
          />

          <button
            type="submit"
            disabled={loading || pin.length < 4}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && (
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            Odblokuj
          </button>
        </form>
      </div>
    </div>
  )
}
