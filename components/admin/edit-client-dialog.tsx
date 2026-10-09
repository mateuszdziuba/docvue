'use client'

import { Loader2, Pencil } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useRouterCompat } from '@/lib/router-compat'
import { updateClientFn } from '@/src/server/clients'
import type { Client } from '@/types/database'

interface EditClientDialogProps {
  client: Client
  onSaved?: () => void | Promise<void>
}

export function EditClientDialog({ client, onSaved }: EditClientDialogProps) {
  const router = useRouterCompat()
  const [open, setOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [name, setName] = useState(client.name ?? '')
  const [phone, setPhone] = useState(client.phone ?? '')
  const [email, setEmail] = useState(client.email ?? '')
  const [birthDate, setBirthDate] = useState(client.birth_date ?? '')
  const [location, setLocation] = useState(client.location ?? '')
  const [address, setAddress] = useState(client.address ?? '')
  const [postalCode, setPostalCode] = useState(client.postal_code ?? '')
  const [city, setCity] = useState(client.city ?? '')
  const [importantInfo, setImportantInfo] = useState(client.important_info ?? '')
  const [notes, setNotes] = useState(client.notes ?? '')

  const resetFromClient = () => {
    setName(client.name ?? '')
    setPhone(client.phone ?? '')
    setEmail(client.email ?? '')
    setBirthDate(client.birth_date ?? '')
    setLocation(client.location ?? '')
    setAddress(client.address ?? '')
    setPostalCode(client.postal_code ?? '')
    setCity(client.city ?? '')
    setImportantInfo(client.important_info ?? '')
    setNotes(client.notes ?? '')
  }

  const handleOpenChange = (next: boolean) => {
    if (next) resetFromClient()
    setOpen(next)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!name.trim()) {
      toast.error('Imię i nazwisko jest wymagane')
      return
    }
    if (!phone.trim()) {
      toast.error('Telefon jest wymagany')
      return
    }

    setIsSaving(true)
    try {
      const result = await updateClientFn({
        data: {
          id: client.id,
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || null,
          birth_date: birthDate || null,
          location: location.trim() || null,
          address: address.trim() || null,
          postal_code: postalCode.trim() || null,
          city: city.trim() || null,
          important_info: importantInfo.trim() || null,
          notes: notes.trim() || null,
        },
      })

      if ('error' in result && result.error) {
        toast.error(result.error)
        return
      }

      toast.success('Dane klienta zaktualizowane')
      await onSaved?.()
      await router.invalidate()
      setOpen(false)
    } catch {
      toast.error('Nie udało się zapisać zmian')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="min-h-11 md:min-h-0">
          <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          Edytuj dane
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edytuj dane klienta</DialogTitle>
          <DialogDescription>
            Zaktualizuj dane kontaktowe, lokalizację i notatki klienta.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-client-name">Imię i nazwisko *</Label>
            <Input
              id="edit-client-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={200}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-client-phone">Telefon *</Label>
              <Input
                id="edit-client-phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-client-email">E-mail</Label>
              <Input
                id="edit-client-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-client-birth">Data urodzenia</Label>
              <Input
                id="edit-client-birth"
                type="date"
                value={birthDate}
                onChange={(event) => setBirthDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-client-location">Lokalizacja</Label>
              <Input
                id="edit-client-location"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="np. Pruszków"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-client-address">Adres</Label>
            <Input
              id="edit-client-address"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="ul. i numer"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-client-postal">Kod pocztowy</Label>
              <Input
                id="edit-client-postal"
                value={postalCode}
                onChange={(event) => setPostalCode(event.target.value)}
                placeholder="00-000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-client-city">Miasto</Label>
              <Input
                id="edit-client-city"
                value={city}
                onChange={(event) => setCity(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-client-important">Ważne informacje</Label>
            <Textarea
              id="edit-client-important"
              value={importantInfo}
              onChange={(event) => setImportantInfo(event.target.value)}
              rows={2}
              placeholder="Np. uczulenia, przeciwwskazania..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-client-notes">Notatki</Label>
            <Textarea
              id="edit-client-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Anuluj
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Zapisywanie...
                </>
              ) : (
                'Zapisz zmiany'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
