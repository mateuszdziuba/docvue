import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getSupabaseBrowserClient } from '../utils/supabase-browser'
import { linkStaffUserFn } from '../server/staff'
import { DocvueLogo } from '@/components/ui/docvue-logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const Route = createFileRoute('/accept-invite')({
  component: AcceptInvitePage,
})

type Step = 'loading' | 'set-password' | 'error'

function AcceptInvitePage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('loading')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()

    // Supabase browser client automatically exchanges the hash tokens on load.
    // We listen for the SIGNED_IN event that fires after the invite token is verified.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
          const displayName = session.user.user_metadata?.name as string | undefined
          if (displayName) setName(displayName)
          setStep('set-password')
        }
      },
    )

    // Also check if session already exists (hash already exchanged)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const displayName = session.user.user_metadata?.name as string | undefined
        if (displayName) setName(displayName)
        setStep('set-password')
      } else {
        // Give the hash exchange a moment, then show error if still no session
        setTimeout(() => {
          setStep((prev) => prev === 'loading' ? 'error' : prev)
        }, 3000)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) { toast.error('Hasło musi mieć co najmniej 6 znaków'); return }
    if (password !== confirm) { toast.error('Hasła nie są zgodne'); return }

    setSaving(true)
    const supabase = getSupabaseBrowserClient()

    // Set the password
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      toast.error(error.message)
      setSaving(false)
      return
    }

    // Link auth user to staff_members record
    const res = await linkStaffUserFn()
    if (res?.error) {
      // Non-fatal — user can still log in
      console.warn('Could not link staff member record:', res.error)
    }

    toast.success('Hasło zostało ustawione — witaj w systemie!')
    await router.invalidate()
    router.navigate({ to: '/dashboard' })
  }

  if (step === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-on-surface-variant">Weryfikacja zaproszenia…</p>
        </div>
      </div>
    )
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-4 max-w-sm">
          <DocvueLogo className="text-xl mx-auto" />
          <h1 className="font-serif text-xl text-on-surface">Link wygasł lub jest nieprawidłowy</h1>
          <p className="text-sm text-on-surface-variant">
            Poproś właściciela salonu o ponowne wysłanie zaproszenia.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-[360px] space-y-8">
        <div className="space-y-1">
          <DocvueLogo className="text-xl" />
        </div>

        <div>
          <h1 className="font-serif text-2xl font-normal text-on-surface">Witaj{name ? `, ${name}` : ''}!</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Ustaw hasło, aby aktywować swoje konto pracownicze.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password">Nowe hasło</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 znaków"
              autoFocus
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">Potwierdź hasło</Label>
            <Input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Powtórz hasło"
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" className="w-full" disabled={saving || !password}>
            {saving ? 'Aktywowanie…' : 'Aktywuj konto'}
          </Button>
        </form>
      </div>
    </div>
  )
}
