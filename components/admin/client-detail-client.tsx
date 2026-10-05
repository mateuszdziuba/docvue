'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useLock } from '@/components/providers/lock-provider'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Combobox } from '@/components/ui/combobox'
import { Link } from '@/lib/link-compat'
import { useRouterCompat } from '@/lib/router-compat'
import { assignFormToClient, deleteClientForm } from '@/src/server/client-forms'
import type { Client, ClientForm, Submission } from '@/types/database'
import { DeleteIconButton } from './delete-icon-button'

interface ClientAppointment {
  id: string
  start_time: string
  status: string
  treatments?: { name?: string | null } | null
}

interface Props {
  client: Client
  clientForms: (ClientForm & { forms: { id: string; title: string; description: string | null } })[]
  availableForms: { id: string; title: string }[]
  submissions?: (Submission & { forms: { title: string } })[]
  appointments?: ClientAppointment[]
}



export function ClientDetailClient({
  client,
  clientForms,
  availableForms,
  submissions = [],
}: Props) {
  const { lock } = useLock()
  const router = useRouterCompat()
  const [isAssigning, setIsAssigning] = useState(false)
  const [selectedFormId, setSelectedFormId] = useState('')
  const [assignmentToDelete, setAssignmentToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleAssignForm = async () => {
    if (!selectedFormId) return

    setIsAssigning(true)
    const result = await assignFormToClient({
      clientId: client.id,
      formId: selectedFormId,
    })

    if (result.error) {
      toast.error(`Błąd przypisywania: ${result.error}`)
      setIsAssigning(false)
      return
    }

    if (result.token) {
      const link = `${window.location.origin}/f/${result.token}`
      try {
        await navigator.clipboard.writeText(link)
        toast.success('Przypisano formularz i skopiowano link', {
          position: 'bottom-center',
        })
      } catch {
        toast.success('Przypisano formularz', { position: 'bottom-center' })
      }
    } else {
      toast.success('Przypisano formularz', { position: 'bottom-center' })
    }

    setSelectedFormId('')
    setIsAssigning(false)
    await router.invalidate()
  }

  const handleCopyLink = async (token: string) => {
    const link = `${window.location.origin}/f/${token}`
    await navigator.clipboard.writeText(link)
    toast.success('Link został skopiowany do schowka', {
      position: 'bottom-center',
    })
  }

  const handleDeleteClick = (clientFormId: string) => {
    setAssignmentToDelete(clientFormId)
  }

  const handleConfirmDelete = async () => {
    if (!assignmentToDelete) return
    setIsDeleting(true)
    try {
      const result = await deleteClientForm(assignmentToDelete)
      if (result && 'error' in result && result.error) {
        toast.error(result.error)
        return
      }
      setAssignmentToDelete(null)
      toast.success('Usunięto przypisanie formularza')
      await router.invalidate()
    } catch (error) {
      console.error('Error deleting assignment:', error)
      toast.error('Wystąpił błąd podczas usuwania przypisania')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl p-6 border border-border/60">
        <h2 className="text-lg font-semibold text-foreground mb-4">Informacje o kliencie</h2>
        {client.important_info && (
          <p className="mb-4 rounded-lg bg-warning-container px-3.5 py-2.5 text-sm font-medium text-on-warning-container">
            {client.important_info}
          </p>
        )}
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Imię i nazwisko</dt>
            <dd className="text-foreground font-medium">{client.name}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Telefon</dt>
            <dd className="text-foreground">{client.phone || '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">E-mail</dt>
            <dd className="text-foreground">{client.email || '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Lokalizacja</dt>
            <dd className="text-foreground">{client.location || client.city || '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Data urodzenia</dt>
            <dd className="text-foreground">
              {client.birth_date
                ? new Date(`${client.birth_date}T00:00:00`).toLocaleDateString('pl-PL')
                : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Data dodania</dt>
            <dd className="text-foreground">
              {new Date(client.created_at).toLocaleDateString('pl-PL')}
            </dd>
          </div>
          {client.last_visit_at && (
            <div>
              <dt className="text-muted-foreground">Ostatnia wizyta</dt>
              <dd className="text-foreground">
                {new Date(client.last_visit_at).toLocaleDateString('pl-PL')}
              </dd>
            </div>
          )}
          {(client.address || client.city) && (
            <div>
              <dt className="text-muted-foreground">Adres</dt>
              <dd className="text-foreground">
                {[client.address, [client.postal_code, client.city].filter(Boolean).join(' ')]
                  .filter(Boolean)
                  .join(', ')}
              </dd>
            </div>
          )}
          {client.referral_source && (
            <div>
              <dt className="text-muted-foreground">Skąd wie o salonie</dt>
              <dd className="text-foreground">{client.referral_source}</dd>
            </div>
          )}
          {client.referred_by && (
            <div>
              <dt className="text-muted-foreground">Osoba polecająca</dt>
              <dd className="text-foreground">{client.referred_by}</dd>
            </div>
          )}
          {client.discount_services || client.discount_products ? (
            <div>
              <dt className="text-muted-foreground">Rabaty</dt>
              <dd className="text-foreground">
                {client.discount_services ? `usługi ${client.discount_services}%` : null}
                {client.discount_services && client.discount_products ? ' · ' : null}
                {client.discount_products ? `produkty ${client.discount_products}%` : null}
              </dd>
            </div>
          ) : null}
        </dl>
        {(client.consent_notifications_sms === false ||
          client.consent_notifications_email === false ||
          client.consent_marketing_sms === false ||
          client.consent_marketing_email === false) && (
          <p className="mt-4 text-xs text-muted-foreground">
            Brak zgód:
            {client.consent_notifications_sms === false ? ' SMS' : ''}
            {client.consent_notifications_email === false ? ' e-mail' : ''}
            {client.consent_marketing_sms === false ? ' marketing SMS' : ''}
            {client.consent_marketing_email === false ? ' marketing e-mail' : ''}
          </p>
        )}
        {client.notes && (
          <div className="mt-4 border-t border-border/60 pt-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Notatka</h3>
            <p className="text-sm text-foreground whitespace-pre-line">{client.notes}</p>
          </div>
        )}
      </div>

      {/* Assign New Form */}
      <div className="bg-card rounded-xl p-6 border border-border/60">
        <h2 className="text-lg font-semibold text-foreground mb-4">Przypisz formularz</h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <label htmlFor="assign-form" className="sr-only">
            Wybierz formularz do przypisania
          </label>
          <Combobox
            id="assign-form"
            options={availableForms.map((form) => ({ value: form.id, label: form.title }))}
            value={selectedFormId}
            onChange={setSelectedFormId}
            placeholder="Wybierz formularz…"
            searchPlaceholder="Szukaj formularza…"
            emptyText="Brak formularzy."
            className="h-11 flex-1 bg-background sm:h-10"
          />
          <button
            type="button"
            onClick={handleAssignForm}
            disabled={!selectedFormId || isAssigning}
            className="px-6 min-h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium rounded-lg disabled:opacity-50 transition-colors sm:w-auto"
          >
            {isAssigning ? 'Przypisywanie...' : 'Przypisz'}
          </button>
        </div>
      </div>

      {/* Assigned Forms */}
      <div className="bg-card rounded-xl p-6 border border-border/60">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Przypisane formularze
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({clientForms.length})
          </span>
        </h2>

        {clientForms.length > 0 ? (
          <div className="space-y-3">
            {clientForms.map((cf) => (
              <div
                key={cf.id}
                className="flex flex-col gap-3 p-4 bg-secondary/30 rounded-lg sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex-1">
                  <h3 className="font-medium text-foreground">{cf.forms?.title}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        cf.status === 'completed'
                          ? 'bg-success-container text-on-success-container'
                          : 'bg-warning-container text-on-warning-container'
                      }`}
                    >
                      {cf.status === 'completed' ? 'Wypełniony' : 'Oczekuje'}
                    </span>
                    {cf.filled_at && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(cf.filled_at).toLocaleDateString('pl-PL')}
                        {cf.filled_by === 'staff' && ' (salon)'}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      Dodano: {new Date(cf.created_at).toLocaleDateString('pl-PL')}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {cf.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleCopyLink(cf.token)}
                        className="px-3 py-2 min-h-11 sm:min-h-0 sm:py-1.5 text-sm font-medium bg-secondary text-foreground hover:bg-secondary/80 rounded-lg transition-colors"
                      >
                        Kopiuj link
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          lock()
                          window.open(`/f/${cf.token}`, '_blank')
                        }}
                        className="px-3 py-2 min-h-11 sm:min-h-0 sm:py-1.5 text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors"
                      >
                        Wypełnij w salonie
                      </button>
                    </>
                  )}
                  <DeleteIconButton
                    label={`Usuń przypisanie formularza ${cf.forms?.title ?? ''}`}
                    onClick={() => handleDeleteClick(cf.id)}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">
            Brak przypisanych formularzy. Wybierz formularz powyżej i kliknij &#34;Przypisz&#34;.
          </p>
        )}
      </div>

      {/* Recent Submissions */}
      <div className="bg-card rounded-xl p-6 border border-border/60">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Historia wypełnień
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({submissions.length})
          </span>
        </h2>

        {submissions.length > 0 ? (
          <div className="space-y-2">
            {submissions.map((sub) => (
              <Link
                key={sub.id}
                href={`/dashboard/submissions/${sub.id}`}
                className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg hover:bg-secondary/60 transition-colors"
              >
                <div>
                  <span className="font-medium text-foreground">{sub.forms?.title}</span>
                  <span className="ml-3 text-sm text-muted-foreground">
                    {new Date(sub.created_at).toLocaleDateString('pl-PL', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                {sub.signature && (
                  <span className="text-xs bg-success/10 text-success px-2 py-1 rounded">
                    Z podpisem
                  </span>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">Brak wypełnionych formularzy.</p>
        )}
      </div>

      <AlertDialog
        open={assignmentToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setAssignmentToDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usuń przypisanie</AlertDialogTitle>
            <AlertDialogDescription>
              Jeśli formularz został już wypełniony, usunięcie przypisania spowoduje również trwałe
              usunięcie przesłanych odpowiedzi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                handleConfirmDelete()
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Usuwanie…' : 'Usuń'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
