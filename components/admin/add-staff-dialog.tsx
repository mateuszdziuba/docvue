'use client'

import { useForm } from '@tanstack/react-form'
import { useState } from 'react'
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
import { inviteStaff } from '@/src/server/staff'

interface AddStaffDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AddStaffDialog({ open, onClose, onSuccess }: AddStaffDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: { name: '', email: '', role: 'staff' as 'staff' | 'manager' },
    onSubmit: async ({ value }) => {
      setServerError(null)
      const result = await inviteStaff({
        name: value.name.trim(),
        email: value.email.trim(),
        role: value.role,
      })
      if (result.error) {
        setServerError(result.error)
        return
      }
      toast.success(`Zaproszenie wysłane do ${value.email}`)
      form.reset()
      onSuccess()
    },
  })

  if (!open) return null

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Zaproś pracownika</DialogTitle>
          <DialogDescription className="sr-only">
            Wyślij zaproszenie do pracownika salonu.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            void form.handleSubmit()
          }}
          className="space-y-4"
        >
          {serverError && (
            <p className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {serverError}
            </p>
          )}

          <form.Field
            name="name"
            validators={{
              onBlur: ({ value }) => (!value.trim() ? 'Imię jest wymagane' : undefined),
            }}
          >
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor="staff-name">Imię i nazwisko</Label>
                <Input
                  id="staff-name"
                  type="text"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="np. Anna Kowalska"
                  aria-invalid={field.state.meta.errors.length > 0}
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-xs text-destructive">{field.state.meta.errors[0]}</p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field
            name="email"
            validators={{
              onBlur: ({ value }) => (!value.trim() ? 'Email jest wymagany' : undefined),
            }}
          >
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor="staff-email">Adres email</Label>
                <Input
                  id="staff-email"
                  type="email"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="pracownik@example.com"
                  aria-invalid={field.state.meta.errors.length > 0}
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-xs text-destructive">{field.state.meta.errors[0]}</p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="role">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor="staff-role">Rola</Label>
                <Select
                  value={field.state.value}
                  onValueChange={(value) => field.handleChange(value as 'staff' | 'manager')}
                >
                  <SelectTrigger id="staff-role" onBlur={field.handleBlur}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Pracownik — dostęp podstawowy</SelectItem>
                    <SelectItem value="manager">Manager — rozszerzony dostęp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </form.Field>

          <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            Pracownik otrzyma email z zaproszeniem i linkiem do ustawienia hasła. Po zalogowaniu
            będzie miał dostęp do klientów, wizyt i formularzy.
          </p>

          <DialogFooter className="gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Anuluj
            </Button>
            <form.Subscribe
              selector={(s) => [s.isSubmitting, s.values.name, s.values.email] as const}
            >
              {([isSubmitting, name, email]) => (
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSubmitting || !name.trim() || !email.trim()}
                >
                  {isSubmitting ? 'Wysyłanie...' : 'Wyślij zaproszenie'}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
