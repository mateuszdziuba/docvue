'use client'

import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { toast } from 'sonner'
import { inviteStaff } from '@/src/server/staff'

interface AddStaffDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const inputClasses =
  'w-full px-3 py-2 text-[14px] rounded-md border border-border bg-background text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors'

export function AddStaffDialog({ open, onClose, onSuccess }: AddStaffDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: { name: '', email: '', role: 'staff' as 'staff' | 'manager' },
    onSubmit: async ({ value }) => {
      setServerError(null)
      const result = await inviteStaff({ name: value.name.trim(), email: value.email.trim(), role: value.role })
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-md bg-card rounded-xl border border-border shadow-modal">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-[15px] font-medium text-on-surface">Zaproś pracownika</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); void form.handleSubmit() }}
          className="p-6 space-y-4"
        >
          {serverError && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2 border border-destructive/20">
              {serverError}
            </p>
          )}

          <form.Field
            name="name"
            validators={{ onBlur: ({ value }) => (!value.trim() ? 'Imię jest wymagane' : undefined) }}
          >
            {(field) => (
              <div>
                <label className="block text-[12px] font-medium text-on-surface-variant mb-1.5">
                  Imię i nazwisko
                </label>
                <input
                  type="text"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="np. Anna Kowalska"
                  className={inputClasses}
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="mt-0.5 text-xs text-destructive">{field.state.meta.errors[0]}</p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field
            name="email"
            validators={{
              onBlur: ({ value }) =>
                !value.trim() ? 'Email jest wymagany' : undefined,
            }}
          >
            {(field) => (
              <div>
                <label className="block text-[12px] font-medium text-on-surface-variant mb-1.5">
                  Adres email
                </label>
                <input
                  type="email"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="pracownik@example.com"
                  className={inputClasses}
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="mt-0.5 text-xs text-destructive">{field.state.meta.errors[0]}</p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="role">
            {(field) => (
              <div>
                <label className="block text-[12px] font-medium text-on-surface-variant mb-1.5">
                  Rola
                </label>
                <select
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value as 'staff' | 'manager')}
                  onBlur={field.handleBlur}
                  className={inputClasses}
                >
                  <option value="staff">Pracownik — dostęp podstawowy</option>
                  <option value="manager">Manager — rozszerzony dostęp</option>
                </select>
              </div>
            )}
          </form.Field>

          <p className="text-[12px] text-on-surface-variant bg-surface-container rounded-md px-3 py-2">
            Pracownik otrzyma email z zaproszeniem i linkiem do ustawienia hasła.
            Po zalogowaniu będzie miał dostęp do klientów, wizyt i formularzy.
          </p>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-[14px] text-on-surface-variant border border-border rounded-md hover:bg-surface-container transition-colors"
            >
              Anuluj
            </button>
            <form.Subscribe selector={(s) => [s.isSubmitting, s.values.name, s.values.email] as const}>
              {([isSubmitting, name, email]) => (
                <button
                  type="submit"
                  disabled={isSubmitting || !name.trim() || !email.trim()}
                  className="flex-1 px-4 py-2 text-[14px] bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Wysyłanie...' : 'Wyślij zaproszenie'}
                </button>
              )}
            </form.Subscribe>
          </div>
        </form>
      </div>
    </div>
  )
}
