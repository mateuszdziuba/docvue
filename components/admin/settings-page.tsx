'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { updateSalonSettingsFn } from '@/src/server/settings'
import { changePasswordFn } from '@/src/server/auth'
import { useTheme } from '@/lib/theme-compat'
import type { Salon } from '@/types/database'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

// ── Types ────────────────────────────────────────────────────────────────────

type Section = 'gabinet' | 'bezpieczenstwo' | 'wyglad' | 'konto'

interface SettingsPageProps {
  salon: Salon | null
  user: { id: string; email: string } | null
}

// ── Icons ────────────────────────────────────────────────────────────────────

const IconBuilding = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
)
const IconShield = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
)
const IconSun = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
)
const IconUser = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
)
const IconMoon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
)
const IconMonitor = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </svg>
)

// ── Section Nav ───────────────────────────────────────────────────────────────

const sections: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: 'gabinet',        label: 'Gabinet',       icon: <IconBuilding /> },
  { id: 'bezpieczenstwo', label: 'Bezpieczeństwo',icon: <IconShield /> },
  { id: 'wyglad',         label: 'Wygląd',        icon: <IconSun /> },
  { id: 'konto',          label: 'Konto',         icon: <IconUser /> },
]

// ── Section: Gabinet ──────────────────────────────────────────────────────────

function GabinetSection({ salon }: { salon: Salon | null }) {
  const [name, setName] = useState(salon?.name ?? '')
  const [phone, setPhone] = useState(salon?.phone ?? '')
  const [address, setAddress] = useState(salon?.address ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { toast.error('Nazwa salonu jest wymagana'); return }
    setSaving(true)
    const res = await updateSalonSettingsFn({ data: { name, phone, address } })
    setSaving(false)
    if (res?.error) { toast.error(res.error); return }
    toast.success('Dane salonu zostały zaktualizowane')
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div>
        <h2 className="font-serif text-xl font-normal text-on-surface">Gabinet</h2>
        <p className="text-sm text-on-surface-variant mt-0.5">Podstawowe informacje o Twoim salonie</p>
      </div>

      <div className="border border-border rounded-lg p-5 space-y-4 bg-card">
        <div className="space-y-1.5">
          <Label htmlFor="salon-name">Nazwa salonu</Label>
          <Input
            id="salon-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Np. Studio Urody Ania"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="salon-phone">Telefon</Label>
          <Input
            id="salon-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+48 123 456 789"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="salon-address">Adres</Label>
          <Input
            id="salon-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="ul. Kwiatowa 1, Warszawa"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? 'Zapisywanie…' : 'Zapisz zmiany'}
        </Button>
      </div>
    </form>
  )
}

// ── Section: Bezpieczeństwo ───────────────────────────────────────────────────

function BezpieczenstwoSection({ salon }: { salon: Salon | null }) {
  const [pinCode, setPinCode] = useState(salon?.pin_code ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const res = await updateSalonSettingsFn({ data: { pin_code: pinCode } })
    setSaving(false)
    if (res?.error) { toast.error(res.error); return }
    toast.success('Kod PIN został zaktualizowany')
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div>
        <h2 className="font-serif text-xl font-normal text-on-surface">Bezpieczeństwo</h2>
        <p className="text-sm text-on-surface-variant mt-0.5">Zabezpieczenia dostępu do panelu</p>
      </div>

      <div className="border border-border rounded-lg p-5 bg-card">
        <p className="text-sm font-medium text-on-surface mb-1">Kod PIN — tryb kiosku</p>
        <p className="text-sm text-on-surface-variant mb-4">
          Ten kod jest wymagany do wyjścia z trybu kiosku (wypełnianie formularzy przez klientów w salonie).
        </p>
        <InputOTP maxLength={4} value={pinCode} onChange={setPinCode}>
          <InputOTPGroup>
            <InputOTPSlot index={0} masked />
            <InputOTPSlot index={1} masked />
            <InputOTPSlot index={2} masked />
            <InputOTPSlot index={3} masked />
          </InputOTPGroup>
        </InputOTP>
        <p className="text-xs text-on-surface-variant/60 mt-3">
          Zostaw puste, aby wyłączyć ochronę PINem.
        </p>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? 'Zapisywanie…' : 'Zapisz zmiany'}
        </Button>
      </div>
    </form>
  )
}

// ── Section: Wygląd ───────────────────────────────────────────────────────────

type ThemeOption = { value: 'light' | 'dark' | 'system'; label: string; icon: React.ReactNode }

const themeOptions: ThemeOption[] = [
  { value: 'light',  label: 'Jasny',    icon: <IconSun /> },
  { value: 'dark',   label: 'Ciemny',   icon: <IconMoon /> },
  { value: 'system', label: 'Systemowy',icon: <IconMonitor /> },
]

function WygladSection() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-xl font-normal text-on-surface">Wygląd</h2>
        <p className="text-sm text-on-surface-variant mt-0.5">Dostosuj motyw kolorystyczny panelu</p>
      </div>

      <div className="border border-border rounded-lg p-5 bg-card space-y-3">
        <p className="text-sm font-medium text-on-surface">Motyw</p>
        <div className="flex gap-3">
          {themeOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTheme(opt.value)}
              className={[
                'flex items-center gap-2 px-4 py-2.5 rounded-md border text-sm transition-colors',
                theme === opt.value
                  ? 'border-primary bg-primary-container text-on-primary-container font-medium'
                  : 'border-border text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
              ].join(' ')}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Section: Konto ────────────────────────────────────────────────────────────

function KontoSection({ user }: { user: { id: string; email: string } | null }) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 6) { toast.error('Hasło musi mieć co najmniej 6 znaków'); return }
    if (newPassword !== confirmPassword) { toast.error('Hasła nie są zgodne'); return }
    setSaving(true)
    const res = await changePasswordFn({ data: { password: newPassword } })
    setSaving(false)
    if (res?.error) { toast.error(res.error); return }
    setNewPassword('')
    setConfirmPassword('')
    toast.success('Hasło zostało zmienione')
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-xl font-normal text-on-surface">Konto</h2>
        <p className="text-sm text-on-surface-variant mt-0.5">Dane logowania do panelu</p>
      </div>

      <div className="border border-border rounded-lg p-5 bg-card space-y-4">
        <div className="space-y-1.5">
          <Label>Adres e-mail</Label>
          <Input
            value={user?.email ?? ''}
            disabled
            className="text-on-surface-variant bg-muted cursor-default"
          />
          <p className="text-xs text-on-surface-variant/60">
            Aby zmienić adres e-mail, skontaktuj się z pomocą techniczną.
          </p>
        </div>
      </div>

      <div className="border border-border rounded-lg p-5 bg-card">
        <p className="text-sm font-medium text-on-surface mb-4">Zmiana hasła</p>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-password">Nowe hasło</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min. 6 znaków"
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Potwierdź nowe hasło</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Powtórz hasło"
              autoComplete="new-password"
            />
          </div>
          <div className="flex justify-end pt-1">
            <Button type="submit" disabled={saving || !newPassword}>
              {saving ? 'Zmienianie…' : 'Zmień hasło'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function SettingsPage({ salon, user }: SettingsPageProps) {
  const [activeSection, setActiveSection] = useState<Section>('gabinet')

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-normal text-on-surface tracking-tight">Ustawienia</h1>
        <p className="text-on-surface-variant text-sm mt-1">Zarządzaj konfiguracją salonu i konta</p>
      </div>

      <div className="flex gap-8">
        {/* Left nav */}
        <nav className="w-44 shrink-0 space-y-0.5">
          {sections.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveSection(s.id)}
              className={[
                'flex items-center gap-2.5 w-full px-3 py-[7px] rounded-md text-[13.5px] text-left transition-colors',
                activeSection === s.id
                  ? 'bg-primary-container text-on-primary-container font-medium'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
              ].join(' ')}
            >
              <span className={activeSection === s.id ? 'text-primary' : 'opacity-70'}>
                {s.icon}
              </span>
              {s.label}
            </button>
          ))}
        </nav>

        {/* Right content */}
        <div className="flex-1 min-w-0">
          {activeSection === 'gabinet'        && <GabinetSection salon={salon} />}
          {activeSection === 'bezpieczenstwo' && <BezpieczenstwoSection salon={salon} />}
          {activeSection === 'wyglad'         && <WygladSection />}
          {activeSection === 'konto'          && <KontoSection user={user} />}
        </div>
      </div>
    </div>
  )
}
