import { createFileRoute, Link, notFound, useNavigate } from '@tanstack/react-router'
import { format, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'
import { useState } from 'react'
import { toast } from 'sonner'
import { APPOINTMENT_STATUS_CONFIG, type AppointmentStatus } from '@/components/admin/status-badge'
import { VisitPhotos } from '@/components/admin/visit-photos'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useInvalidateOnFocus } from '@/lib/use-invalidate-on-focus'
import {
  deleteAppointmentFn,
  getAppointmentFn,
  updateAppointmentFn,
} from '@/src/server/appointments'
import { getOrCreateFormTokenFn } from '@/src/server/client-forms'

interface RequiredFormInfo {
  id: string
  title: string
  token: string | null
  submitted: boolean
}

export const Route = createFileRoute('/_authed/dashboard/visits/$visitId')({
  loader: async ({ params, context }) => {
    const { isOwner } = context as { isOwner?: boolean }
    const result = await getAppointmentFn({ data: { id: params.visitId } })
    if (result.error || !result.appointment) throw notFound()
    return {
      appointment: result.appointment,
      isOwner: isOwner ?? false,
      requiredForms: ((result as { requiredForms?: RequiredFormInfo[] }).requiredForms ??
        []) as RequiredFormInfo[],
    }
  },
  component: VisitDetailPage,
})

const statusKeys = Object.keys(APPOINTMENT_STATUS_CONFIG) as AppointmentStatus[]

function VisitDetailPage() {
  useInvalidateOnFocus()
  const { appointment: initial, isOwner, requiredForms } = Route.useLoaderData()
  const navigate = useNavigate()
  const apt = initial as any
  const [status, setStatus] = useState<AppointmentStatus>(apt.status)
  const [notes, setNotes] = useState(apt.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  async function handleSave() {
    setSaving(true)
    const result = await updateAppointmentFn({
      data: { id: apt.id, status, notes: notes || null },
    })
    setSaving(false)
    if (result?.error) toast.error(result.error)
    else toast.success('Wizyta zaktualizowana')
  }

  async function resolveFormToken(form: RequiredFormInfo): Promise<string | null> {
    if (form.token) return form.token
    const result = await getOrCreateFormTokenFn({
      data: { clientId: apt.client_id, formId: form.id },
    })
    if ('error' in result && result.error) {
      toast.error(result.error)
      return null
    }
    return (result as { token?: string }).token ?? null
  }

  async function handleCopyFormLink(form: RequiredFormInfo) {
    const token = await resolveFormToken(form)
    if (!token) return
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/f/${token}`)
      toast.success('Link skopiowany')
    } catch {
      toast.error('Nie udało się skopiować linku')
    }
  }

  async function handleFillFormInSalon(form: RequiredFormInfo) {
    const token = await resolveFormToken(form)
    if (!token) return
    const url = `${window.location.origin}/f/${token}?source=salon`
    const opened = window.open(url, '_blank')
    if (opened) {
      opened.opener = null
      return
    }
    // Popup zablokowany (np. PWA) — przynajmniej skopiuj link.
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link skopiowany — otwórz go na urządzeniu klienta')
    } catch {
      toast.error('Nie udało się otworzyć formularza')
    }
  }

  async function handleDelete() {
    setDeleting(true)
    const result = await deleteAppointmentFn({ data: { id: apt.id } })
    setDeleting(false)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    toast.success('Wizyta usunięta')
    navigate({ to: '/dashboard/visits' })
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          to="/dashboard/visits"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Wizyty
        </Link>
        {isOwner && (
          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={deleting}>
                Usuń
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Usuń wizytę</AlertDialogTitle>
                <AlertDialogDescription>
                  Czy na pewno chcesz usunąć tę wizytę? Tej operacji nie można cofnąć.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Anuluj</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(event) => {
                    event.preventDefault()
                    void handleDelete()
                  }}
                  disabled={deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? 'Usuwanie…' : 'Usuń'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <div className="bg-card rounded-lg border border-border p-5 space-y-4">
        <div>
          <h1 className="font-serif text-xl font-normal text-foreground tracking-tight">
            {apt.treatments?.name ?? 'Zabieg'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {apt.clients?.name ?? 'Klient'} ·{' '}
            {format(parseISO(apt.start_time), 'd MMMM yyyy, HH:mm', {
              locale: pl,
            })}
          </p>
        </div>

        <div>
          <label
            htmlFor="visit-status"
            className="block text-xs font-medium text-muted-foreground mb-1.5"
          >
            Status
          </label>
          <Select
            value={status}
            onValueChange={(value) => setStatus(value as AppointmentStatus)}
            disabled={!isOwner}
          >
            <SelectTrigger id="visit-status" className="w-full sm:max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusKeys.map((key) => (
                <SelectItem key={key} value={key}>
                  {APPOINTMENT_STATUS_CONFIG[key].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label
            htmlFor="visit-notes"
            className="block text-xs font-medium text-muted-foreground mb-1.5"
          >
            Notatki
          </label>
          <Textarea
            id="visit-notes"
            value={notes}
            onChange={(e) => isOwner && setNotes(e.target.value)}
            readOnly={!isOwner}
            rows={3}
            className="resize-none"
            placeholder="Dodatkowe informacje o wizycie…"
          />
        </div>

        {isOwner && (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Zapisywanie…' : 'Zapisz zmiany'}
          </Button>
        )}
      </div>

      {requiredForms && requiredForms.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-medium text-foreground">Wymagane formularze</h2>
            {requiredForms.some((form) => !form.submitted) && (
              <span className="text-xs font-medium text-warning">Status: czeka na formularz</span>
            )}
          </div>
          <ul className="divide-y divide-border">
            {requiredForms.map((form) => (
              <li
                key={form.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                      form.submitted ? 'bg-success' : 'bg-warning'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="truncate text-sm text-foreground">{form.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-medium ${
                      form.submitted ? 'text-success' : 'text-warning'
                    }`}
                  >
                    {form.submitted ? 'Wypełniony' : 'Oczekuje'}
                  </span>
                  {!form.submitted && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleCopyFormLink(form)}
                      >
                        Kopiuj link
                      </Button>
                      {form.token ? (
                        <Button size="sm" asChild>
                          <a
                            href={`/f/${form.token}?source=salon`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Wypełnij w salonie
                          </a>
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => void handleFillFormInSalon(form)}>
                          Wypełnij w salonie
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <VisitPhotos appointment={apt} />
    </div>
  )
}
