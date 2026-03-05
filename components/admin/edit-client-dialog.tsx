'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { updateClient } from '@/actions/clients'
import type { Client } from '@/types/database'
import * as Dialog from '@radix-ui/react-dialog'
import { DatePicker } from "@/components/ui/date-picker"

interface EditClientDialogProps {
  client: Client
  trigger: React.ReactNode
}

export function EditClientDialog({ client, trigger }: EditClientDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: client.name,
    email: client.email || '',
    phone: client.phone || '',
    birth_date: client.birth_date ? new Date(client.birth_date) : undefined,
    notes: client.notes || '',
  })
  const [date, setDate] = useState<Date | undefined>(
    client.birth_date ? new Date(client.birth_date) : undefined
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    const result = await updateClient(client.id, {
      name: formData.name,
      email: formData.email || undefined,
      phone: formData.phone,
      birth_date: date ? date.toISOString() : undefined,
      notes: formData.notes || undefined,
    })

    setIsSaving(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success('Dane klienta zostały zaktualizowane')
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        {trigger}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in duration-200" />
        <Dialog.Content className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-lg bg-card rounded-2xl shadow-xl p-6 z-50 animate-in zoom-in-95 duration-200 border border-border/60">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-xl font-bold text-foreground">
              Edytuj klienta
            </Dialog.Title>
            <Dialog.Close className="text-muted-foreground hover:text-foreground">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Imię i nazwisko *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-ring/40 focus:border-primary outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Telefon *
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-ring/40 focus:border-primary outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Email (opcjonalnie)
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-ring/40 focus:border-primary outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Data urodzenia
                </label>
                <DatePicker 
                  date={date} 
                  setDate={setDate} 
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Notatki
              </label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-ring/40 focus:border-primary outline-none transition-all"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="px-4 py-2 text-muted-foreground hover:text-foreground font-medium"
                >
                  Anuluj
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2 bg-primary text-primary-foreground hover:bg-primary/90 font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Zapisywanie...' : 'Zapisz zmiany'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
