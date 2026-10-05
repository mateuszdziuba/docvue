// Note: LockProvider and useLock are in components/providers/lock-provider.tsx
// This file only exports the LockScreen UI component

import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { getSupabaseBrowserClient } from '@/src/utils/supabase-browser'

interface LockScreenProps {
  onUnlock: () => void
}

export function LockScreen({ onUnlock }: LockScreenProps) {
  const [pin, setPin] = useState('')
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [salonPin, setSalonPin] = useState<string | null>(null)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [lockedUntil, setLockedUntil] = useState(0)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (lockedUntil <= Date.now()) return
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [lockedUntil])

  useEffect(() => {
    const fetchSalonPin = async () => {
      const supabase = getSupabaseBrowserClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('salons')
          .select('pin_code')
          .eq('user_id', user.id)
          .single()
        if (data) setSalonPin(data.pin_code)
      }
    }
    fetchSalonPin()
  }, [])

  const lockSecondsLeft = Math.max(0, Math.ceil((lockedUntil - now) / 1000))

  const handleUnlockWithPin = (pinValue: string) => {
    if (lockSecondsLeft > 0) return
    setLoading(true)
    setTimeout(() => {
      if (salonPin && pinValue === salonPin) {
        toast.success('Odblokowano')
        setFailedAttempts(0)
        onUnlock()
      } else if (!salonPin) {
        toast.success('Odblokowano (Brak ustawionego PINu)')
        onUnlock()
      } else {
        const attempts = failedAttempts + 1
        setFailedAttempts(attempts)
        setPin('')
        if (attempts >= 5) {
          const until = Date.now() + 30_000
          setLockedUntil(until)
          setNow(Date.now())
          setFailedAttempts(0)
          toast.error('Zbyt wiele prób. Odczekaj 30 sekund.')
        } else {
          toast.error(`Nieprawidłowy kod PIN (próba ${attempts}/5)`)
        }
      }
      setLoading(false)
    }, 500)
  }

  return (
    <div className="fixed inset-0 z-[100] bg-foreground/95 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lock-title"
        className="w-full max-w-sm bg-card rounded-2xl shadow-2xl p-8 text-center animate-in zoom-in-95 duration-300"
      >
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>

        <h2 id="lock-title" className="text-2xl font-bold text-foreground mb-2">
          Panel zablokowany
        </h2>
        <p className="text-muted-foreground mb-8">
          Wprowadź kod PIN salonu, aby powrócić do panelu zarządzania.
        </p>

        <div className="flex flex-col items-center space-y-6">
          <InputOTP
            maxLength={4}
            value={pin}
            disabled={lockSecondsLeft > 0}
            aria-label="Kod PIN salonu"
            aria-invalid={lockSecondsLeft > 0 || failedAttempts > 0 ? true : undefined}
            onChange={(value) => {
              setPin(value)
              if (value.length === 4) {
                setTimeout(() => handleUnlockWithPin(value), 100)
              }
            }}
            autoFocus
          >
            <InputOTPGroup className="gap-2">
              <InputOTPSlot
                index={0}
                masked
                className="w-12 h-14 text-2xl border-2 border-border rounded-lg"
              />
              <InputOTPSlot
                index={1}
                masked
                className="w-12 h-14 text-2xl border-2 border-border rounded-lg"
              />
              <InputOTPSlot
                index={2}
                masked
                className="w-12 h-14 text-2xl border-2 border-border rounded-lg"
              />
              <InputOTPSlot
                index={3}
                masked
                className="w-12 h-14 text-2xl border-2 border-border rounded-lg"
              />
            </InputOTPGroup>
          </InputOTP>

          {lockSecondsLeft > 0 && (
            <p role="status" className="text-sm text-destructive">
              Zbyt wiele prób. Spróbuj ponownie za {lockSecondsLeft} s.
            </p>
          )}

          <Button
            onClick={() => handleUnlockWithPin(pin)}
            disabled={loading || pin.length < 4 || lockSecondsLeft > 0}
            size="lg"
            className="w-full"
          >
            {loading && (
              <svg
                className="animate-spin h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
            Odblokuj
          </Button>
        </div>

        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-sm text-muted-foreground mb-3">Nie pamiętasz kodu PIN?</p>
          <Button
            variant="link"
            onClick={() => navigate({ to: '/logout' })}
            className="text-sm font-medium text-destructive hover:text-destructive/80"
          >
            Wyloguj się
          </Button>
        </div>
      </div>
    </div>
  )
}
