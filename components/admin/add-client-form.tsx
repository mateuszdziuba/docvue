'use client'

import { useForm } from '@tanstack/react-form'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createClientAction } from '@/src/server/clients'

interface AddClientFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export function AddClientForm({ onSuccess, onCancel }: AddClientFormProps) {
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: { name: '', phone: '+48 ', email: '', birthDate: '', notes: '' },
    onSubmit: async ({ value }) => {
      setServerError(null)
      if (!value.name.trim()) {
        setServerError('Imię i nazwisko jest wymagane')
        return
      }
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
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        void form.handleSubmit()
      }}
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
              <Label htmlFor="client-name" className="text-sm font-medium text-foreground mb-1">
                Imię i nazwisko *
              </Label>
              <Input
                id="client-name"
                type="text"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder="Anna Kowalska"
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
              <Label htmlFor="client-phone" className="text-sm font-medium text-foreground mb-1">
                Telefon *
              </Label>
              <Input
                id="client-phone"
                type="tel"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder="+48 123 456 789"
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
              <Label htmlFor="client-email" className="text-sm font-medium text-foreground mb-1">
                Email (opcjonalnie)
              </Label>
              <Input
                id="client-email"
                type="email"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder="anna@example.com"
              />
            </div>
          )}
        </form.Field>

        <form.Field name="birthDate">
          {(field) => (
            <div>
              <Label className="text-sm font-medium text-foreground mb-1">Data urodzenia</Label>
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
            <Label htmlFor="client-notes" className="text-sm font-medium text-foreground mb-1">
              Notatki
            </Label>
            <Textarea
              id="client-notes"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              placeholder="Dodatkowe informacje o kliencie..."
              rows={2}
            />
          </div>
        )}
      </form.Field>

      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Anuluj
          </Button>
        )}
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Dodawanie...' : 'Dodaj klienta'}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  )
}
