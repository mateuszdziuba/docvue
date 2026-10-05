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
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    let active = true

    const applySession = (
      session: { user: { email?: string; user_metadata?: Record<string, unknown> } } | null,
    ) => {
      if (!active || !session) return false
      const displayName = session.user.user_metadata?.name as string | undefined
      if (displayName) setName(displayName)
      if (session.user.email) setEmail(session.user.email)
      setStep('set-password')
      return true
    }

    // @supabase/ssr forces PKCE, but admin-generated recovery/invite links
    // (and the default e-mail templates) return implicit-flow tokens in the
    // URL hash. Handle both explicitly instead of relying on detection.
    const acceptSessionFromUrl = async () => {
      const url = new URL(window.location.href)
      const code = url.searchParams.get('code')
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error && applySession(data.session)) {
          url.searchParams.delete('code')
          window.history.replaceState(null, '', url.pathname + url.search)
          return true
        }
      }

      const hash = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : ''
      const params = new URLSearchParams(hash)
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')
      if (accessToken && refreshToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        if (!error && applySession(data.session)) {
          window.history.replaceState(null, '', url.pathname + url.search)
          return true
        }
      }

      const { data } = await supabase.auth.getSession()
      return applySession(data.session)
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        applySession(session)
      },
    )

    acceptSessionFromUrl().then((ok) => {
      if (!ok && active) {
        setTimeout(() => {
          setStep((prev) => (prev === 'loading' ? 'error' : prev))
        }, 3000)
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (password.length < 8) {
      setFormError('Hasło musi mieć co najmniej 8 znaków')
      return
    }
    if (password !== confirm) {
      setFormError('Hasła nie są zgodne')
      return
    }

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
          <input
            type="email"
            name="email"
            autoComplete="username"
            value={email}
            readOnly
            hidden
            tabIndex={-1}
          />
          <div className="space-y-1.5">
            <Label htmlFor="password">Nowe hasło</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 znaków"
              autoFocus
              autoComplete="new-password"
              aria-invalid={formError ? true : undefined}
              aria-describedby={formError ? 'invite-error' : undefined}
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
              aria-invalid={formError ? true : undefined}
              aria-describedby={formError ? 'invite-error' : undefined}
            />
          </div>
          {formError && (
            <p
              id="invite-error"
              role="alert"
              className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2.5 border border-destructive/20"
            >
              {formError}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={saving || !password}>
            {saving ? 'Aktywowanie…' : 'Aktywuj konto'}
          </Button>
        </form>
      </div>
    </div>
  )
}
