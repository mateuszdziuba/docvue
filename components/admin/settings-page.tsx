'use client'

import { Copy } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SALON_TOKENS } from '@/lib/salon-placeholders'
import { useTheme } from '@/lib/theme-compat'
import { changePasswordFn } from '@/src/server/auth'
import { updateSalonSettingsFn } from '@/src/server/settings'
import type { Salon } from '@/types/database'

// ── Types ────────────────────────────────────────────────────────────────────

type Section = 'gabinet' | 'bezpieczenstwo' | 'wyglad' | 'konto'

interface SettingsPageProps {
  salon: Salon | null
  user: { id: string; email: string } | null
}

// ── Icons ────────────────────────────────────────────────────────────────────

const IconBuilding = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
)
const IconShield = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
)
const IconSun = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
)
const IconUser = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
)
const IconMoon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
)
const IconMonitor = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </svg>
)

// ── Section Nav ───────────────────────────────────────────────────────────────

const sections: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: 'gabinet', label: 'Gabinet', icon: <IconBuilding /> },
  { id: 'bezpieczenstwo', label: 'Bezpieczeństwo', icon: <IconShield /> },
  { id: 'wyglad', label: 'Wygląd', icon: <IconSun /> },
  { id: 'konto', label: 'Konto', icon: <IconUser /> },
]

// ── Salon form tokens ─────────────────────────────────────────────────────────

function TokenList() {
  const handleCopy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token)
      toast.success('Skopiowano znacznik')
    } catch {
      toast.error('Nie udało się skopiować')
    }
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {SALON_TOKENS.map(({ token, label }) => (
        <li key={token} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-on-surface">{label}</p>
            <code className="text-xs text-on-surface-variant">{token}</code>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleCopy(token)}
            aria-label={`Skopiuj znacznik ${label}`}
          >
            <Copy className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Kopiuj
          </Button>
        </li>
      ))}
    </ul>
  )
}

// ── Section: Gabinet ──────────────────────────────────────────────────────────

function GabinetSection({ salon }: { salon: Salon | null }) {
  const [name, setName] = useState(salon?.name ?? '')
  const [phone, setPhone] = useState(salon?.phone ?? '')
  const [address, setAddress] = useState(salon?.address ?? '')
  const [city, setCity] = useState(salon?.city ?? '')
  const [email, setEmail] = useState(salon?.email ?? '')
  const [website, setWebsite] = useState(salon?.website ?? '')
  const [socialMedia, setSocialMedia] = useState(salon?.social_media ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Nazwa salonu jest wymagana')
      return
    }
    setSaving(true)
    const res = await updateSalonSettingsFn({
      data: {
        name,
        phone,
        address,
        city,
        email,
        website,
        social_media: socialMedia,
      },
    })
    setSaving(false)
    if (res?.error) {
      toast.error(res.error)
      return
    }
    toast.success('Dane salonu zostały zaktualizowane')
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-xl font-normal">Gabinet</CardTitle>
          <CardDescription>
            Podstawowe informacje o salonie — używane w panelu i automatycznie wstawiane do
            formularzy.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
              placeholder="ul. Kwiatowa 1"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="salon-city">Miasto</Label>
            <Input
              id="salon-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Warszawa"
            />
            <p className="text-xs text-muted-foreground">
              Używane przy podpisie na dokumencie PDF („Miasto, data”) oraz jako znacznik [MIASTO].
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="salon-email">E-mail kontaktowy</Label>
            <Input
              id="salon-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="kontakt@salon.pl"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="salon-website">Strona internetowa</Label>
            <Input
              id="salon-website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://www.salon.pl"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="salon-social">Portale społecznościowe</Label>
            <Input
              id="salon-social"
              value={socialMedia}
              onChange={(e) => setSocialMedia(e.target.value)}
              placeholder="Instagram: @salon, Facebook: /salon"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Te dane są automatycznie wstawiane w formularzach (np. RODO, zgody) w miejsca oznaczone
            znacznikami z sekcji poniżej.
          </p>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? 'Zapisywanie…' : 'Zapisz zmiany'}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-xl font-normal">Zmienne formularzy</CardTitle>
          <CardDescription>
            Builder formularzy ma przyciski szybkiego wstawiania tych znaczników — u klienta zostaną
            zastąpione danymi gabinetu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TokenList />
        </CardContent>
      </Card>
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
    if (res?.error) {
      toast.error(res.error)
      return
    }
    toast.success('Kod PIN został zaktualizowany')
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-xl font-normal">Bezpieczeństwo</CardTitle>
          <CardDescription>Zabezpieczenia dostępu do panelu i trybu kiosku.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-medium text-on-surface mb-1">Kod PIN — tryb kiosku</p>
          <p className="text-sm text-on-surface-variant mb-4">
            Ten kod jest wymagany do wyjścia z trybu kiosku (wypełnianie formularzy przez klientów w
            salonie).
          </p>
          <InputOTP
            maxLength={4}
            value={pinCode}
            onChange={setPinCode}
            aria-label="Kod PIN — tryb kiosku"
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} masked />
              <InputOTPSlot index={1} masked />
              <InputOTPSlot index={2} masked />
              <InputOTPSlot index={3} masked />
            </InputOTPGroup>
          </InputOTP>
          <p className="text-xs text-on-surface-variant mt-3">
            Zostaw puste, aby wyłączyć ochronę PINem.
          </p>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? 'Zapisywanie…' : 'Zapisz zmiany'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}

// ── Section: Wygląd ───────────────────────────────────────────────────────────

type ThemeOption = { value: 'light' | 'dark' | 'system'; label: string; icon: React.ReactNode }

const themeOptions: ThemeOption[] = [
  { value: 'light', label: 'Jasny', icon: <IconSun /> },
  { value: 'dark', label: 'Ciemny', icon: <IconMoon /> },
  { value: 'system', label: 'Systemowy', icon: <IconMonitor /> },
]

function WygladSection() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-xl font-normal">Wygląd</CardTitle>
          <CardDescription>Dostosuj motyw kolorystyczny panelu.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm font-medium text-on-surface">Motyw</p>
          <RadioGroup
            value={theme}
            onValueChange={(value) => setTheme(value as ThemeOption['value'])}
            className="grid grid-cols-1 gap-3 sm:grid-cols-3"
          >
            {themeOptions.map((opt) => (
              <Label
                key={opt.value}
                htmlFor={`theme-${opt.value}`}
                className={[
                  'flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2.5 text-sm transition-colors focus-within:ring-2 focus-within:ring-ring',
                  theme === opt.value
                    ? 'border-primary bg-primary-container text-on-primary-container font-medium'
                    : 'border-border text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
                ].join(' ')}
              >
                <RadioGroupItem value={opt.value} id={`theme-${opt.value}`} className="sr-only" />
                {opt.icon}
                {opt.label}
              </Label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>
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
    if (newPassword.length < 6) {
      toast.error('Hasło musi mieć co najmniej 6 znaków')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Hasła nie są zgodne')
      return
    }
    setSaving(true)
    const res = await changePasswordFn({ data: { password: newPassword } })
    setSaving(false)
    if (res?.error) {
      toast.error(res.error)
      return
    }
    setNewPassword('')
    setConfirmPassword('')
    toast.success('Hasło zostało zmienione')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-xl font-normal">Konto</CardTitle>
          <CardDescription>Dane logowania do panelu.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Adres e-mail</Label>
            <Input
              value={user?.email ?? ''}
              disabled
              className="text-on-surface-variant bg-muted cursor-default"
            />
            <p className="text-xs text-on-surface-variant">
              Aby zmienić adres e-mail, skontaktuj się z pomocą techniczną.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg font-normal">Zmiana hasła</CardTitle>
          <CardDescription>Ustaw nowe hasło do swojego konta.</CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function SettingsPage({ salon, user }: SettingsPageProps) {
  const [activeSection, setActiveSection] = useState<Section>('gabinet')

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-normal text-on-surface tracking-tight">
          Ustawienia
        </h1>
        <p className="text-on-surface-variant text-sm mt-1">
          Zarządzaj konfiguracją salonu i konta
        </p>
      </div>

      <Tabs
        value={activeSection}
        onValueChange={(value) => setActiveSection(value as Section)}
        className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8"
      >
        <TabsList className="h-auto w-full flex-nowrap justify-start gap-1 overflow-x-auto md:w-44 md:shrink-0 md:flex-col md:items-stretch md:justify-start md:bg-transparent">
          {sections.map((s) => (
            <TabsTrigger
              key={s.id}
              value={s.id}
              className="min-h-11 shrink-0 justify-start gap-2.5 px-3 py-2 text-sm md:min-h-0 data-[state=active]:bg-primary-container data-[state=active]:text-on-primary-container data-[state=active]:font-medium data-[state=active]:shadow-none"
            >
              <span className={activeSection === s.id ? 'text-primary' : 'opacity-70'}>
                {s.icon}
              </span>
              {s.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="min-w-0 flex-1">
          <TabsContent value="gabinet" className="mt-0">
            <GabinetSection salon={salon} />
          </TabsContent>
          <TabsContent value="bezpieczenstwo" className="mt-0">
            <BezpieczenstwoSection salon={salon} />
          </TabsContent>
          <TabsContent value="wyglad" className="mt-0">
            <WygladSection />
          </TabsContent>
          <TabsContent value="konto" className="mt-0">
            <KontoSection user={user} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
