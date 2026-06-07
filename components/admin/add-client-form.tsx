'use client'

import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { createClientAction } from '@/src/server/clients'
import { DatePicker } from '@/components/ui/date-picker'

interface AddClientFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

const inputClasses =
  'w-full px-4 py-2 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-ring/40 focus:border-primary outline-none transition-all'

export function AddClientForm({ onSuccess, onCancel }: AddClientFormProps) {
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: { name: '', phone: '+48 ', email: '', birthDate: '', notes: '' },
    onSubmit: async ({ value }) => {
      setServerError(null)
      if (!value.name.trim()) { setServerError('Imię i nazwisko jest wymagane'); return }
      if (!value.phone.trim() || value.phone.trim() === '+48') {
        setServerError('Numer telefonu jest wymagany')
        return
      }

      const result = await createClientAction({
        name: value.name.trim(),
        email: value.email.trim() || undefined,
        phone: value.phone.trim(),
        birth_date: value.birthDate ? new Date(value.birthDate).toISOString() : undefined,
        notes: value.notes.trim() || undefined,
      })

      if (result.error) {
        setServerError(result.error)
        return
      }

      form.reset()
      onSuccess?.()
    },
  })

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); void form.handleSubmit() }}
      className="space-y-4"
    >
      {serverError && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
          {serverError}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <form.Field
          name="name"
          validators={{ onBlur: ({ value }) => (!value.trim() ? 'Wymagane' : undefined) }}
        >
          {(field) => (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Imię i nazwisko *
              </label>
              <input
                type="text"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder="Anna Kowalska"
                className={inputClasses}
              />
              {field.state.meta.errors.length > 0 && (
                <p className="mt-0.5 text-xs text-destructive">{field.state.meta.errors[0]}</p>
              )}
            </div>
          )}
        </form.Field>

        <form.Field
          name="phone"
          validators={{
            onBlur: ({ value }) =>
              !value.trim() || value.trim() === '+48' ? 'Wymagany numer telefonu' : undefined,
          }}
        >
          {(field) => (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Telefon *
              </label>
              <input
                type="tel"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder="+48 123 456 789"
                className={inputClasses}
              />
              {field.state.meta.errors.length > 0 && (
                <p className="mt-0.5 text-xs text-destructive">{field.state.meta.errors[0]}</p>
              )}
            </div>
          )}
        </form.Field>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <form.Field name="email">
          {(field) => (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Email (opcjonalnie)
              </label>
              <input
                type="email"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder="anna@example.com"
                className={inputClasses}
              />
            </div>
          )}
        </form.Field>

        <form.Field name="birthDate">
          {(field) => (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Data urodzenia
              </label>
              <DatePicker
                date={field.state.value ? new Date(field.state.value) : undefined}
                setDate={(date) => field.handleChange(date ? date.toISOString() : '')}
                placeholder="Wybierz datę urodzenia"
              />
            </div>
          )}
        </form.Field>
      </div>

      <form.Field name="notes">
        {(field) => (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Notatki
            </label>
            <textarea
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              placeholder="Dodatkowe informacje o kliencie..."
              rows={2}
              className={inputClasses}
            />
          </div>
        )}
      </form.Field>

      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-muted-foreground hover:text-foreground"
          >
            Anuluj
          </button>
        )}
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-primary text-primary-foreground hover:bg-primary/90 font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Dodawanie...' : 'Dodaj klienta'}
            </button>
          )}
        </form.Subscribe>
      </div>
    </form>
  )
}
