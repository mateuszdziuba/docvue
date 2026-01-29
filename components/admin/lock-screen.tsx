'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { logout } from '@/actions/auth'

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

  const handleUnlockWithPin = (pinValue: string) => {
    setLoading(true)

    // Wait a bit for UX
    setTimeout(() => {
      // If no PIN is set in DB, allow unlock with 4 zeros or just unlock
      // But user should set a PIN. Taking "0000" as fallback or if salonPin is null allow any 4 digit?
      // Better: if salonPin is null, ANY 4-digit pin works to unlock, and we warn?
      // For now consistency: checks against salonPin.
      
      if (salonPin && pinValue === salonPin) {
        toast.success('Odblokowano')
        onUnlock()
      } else if (!salonPin) {
          // If no PIN set, allow unlock but maybe warn?
          // For now, let's say default is 0000 or allow unlock
          toast.success('Odblokowano (Brak ustawionego PINu)')
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

        <div className="flex flex-col items-center space-y-6">
          <InputOTP
            maxLength={4}
            value={pin}
            onChange={(value) => {
              setPin(value)
              if (value.length === 4) {
                // Auto-submit when full
                setTimeout(() => handleUnlockWithPin(value), 100)
              }
            }}
            autoFocus
          >
            <InputOTPGroup className="gap-2">
              <InputOTPSlot index={0} className="w-12 h-14 text-2xl border-2 border-gray-200 dark:border-gray-700 rounded-lg" />
              <InputOTPSlot index={1} className="w-12 h-14 text-2xl border-2 border-gray-200 dark:border-gray-700 rounded-lg" />
              <InputOTPSlot index={2} className="w-12 h-14 text-2xl border-2 border-gray-200 dark:border-gray-700 rounded-lg" />
              <InputOTPSlot index={3} className="w-12 h-14 text-2xl border-2 border-gray-200 dark:border-gray-700 rounded-lg" />
            </InputOTPGroup>
          </InputOTP>

          <button
            onClick={() => handleUnlockWithPin(pin)}
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
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Nie pamiętasz kodu PIN?
          </p>
          <form action={logout}>
            <button
              type="submit"
              className="text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
            >
              Wyloguj się
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
