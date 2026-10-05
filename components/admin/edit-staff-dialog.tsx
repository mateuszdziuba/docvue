'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { updateStaff } from '@/src/server/staff'
import type { StaffMember } from '@/types/database'

interface EditStaffDialogProps {
  staff: StaffMember | null
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}

export function EditStaffDialog({ staff, onOpenChange, onSaved }: EditStaffDialogProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'staff' | 'manager'>('staff')
  const [isActive, setIsActive] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (staff) {
      setName(staff.name)
      setEmail(staff.email)
      setRole(staff.role)
      setIsActive(staff.is_active)
      setError(null)
    }
  }, [staff])

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!staff) return
    if (!name.trim()) {
      setError('Imię i nazwisko jest wymagane.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setError('Podaj poprawny adres e-mail.')
      return
    }
    setIsSaving(true)
    setError(null)
    const result = await updateStaff({
      id: staff.id,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role,
      is_active: isActive,
    })
    setIsSaving(false)
    if (result.error) {
      setError(result.error)
      return
    }
    toast.success('Dane pracownika zaktualizowane')
    onOpenChange(false)
    onSaved?.()
  }

  return (
    <Dialog
      open={staff !== null}
      onOpenChange={(open) => {
        if (!open) onOpenChange(false)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edytuj pracownika</DialogTitle>
          <DialogDescription>
            Zmień dane, rolę lub status konta pracownika. Zmiana adresu e-mail dotyczy tylko wpisu w
            salonie — login pozostaje bez zmian.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4">
          {error && (
            <p
              role="alert"
              className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="edit-staff-name">Imię i nazwisko</Label>
            <Input
              id="edit-staff-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="np. Anna Kowalska"
              disabled={isSaving}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-staff-email">Adres e-mail</Label>
            <Input
              id="edit-staff-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="pracownik@example.com"
              disabled={isSaving}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-staff-role">Rola</Label>
            <Select
              value={role}
              onValueChange={(value) => setRole(value as 'staff' | 'manager')}
              disabled={isSaving}
            >
              <SelectTrigger id="edit-staff-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="staff">Pracownik — dostęp podstawowy</SelectItem>
                <SelectItem value="manager">Manager — rozszerzony dostęp</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
            <Label htmlFor="edit-staff-active" className="cursor-pointer">
              Konto aktywne
            </Label>
            <Switch
              id="edit-staff-active"
              checked={isActive}
              onCheckedChange={setIsActive}
              disabled={isSaving}
            />
          </div>

          <DialogFooter className="gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Anuluj
            </Button>
            <Button type="submit" className="flex-1" disabled={isSaving}>
              {isSaving ? 'Zapisywanie…' : 'Zapisz zmiany'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
