import {
  createFileRoute,
  Link,
  notFound,
  useNavigate,
} from '@tanstack/react-router'
import {
  getAppointmentFn,
  updateAppointmentFn,
  deleteAppointmentFn,
} from '@/src/server/appointments'
import { format, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'
import { toast } from 'sonner'
import { useState } from 'react'
import { VisitPhotos } from '@/components/admin/visit-photos'

export const Route = createFileRoute('/_authed/dashboard/visits/$visitId')({
  loader: async ({ params, context }) => {
    const { isOwner } = context as { isOwner?: boolean }
    const result = await getAppointmentFn({ data: { id: params.visitId } })
    if (result.error || !result.appointment) throw notFound()
    return { appointment: result.appointment, isOwner: isOwner ?? false }
  },
  component: VisitDetailPage,
})

const statusOptions = [
  { value: 'scheduled', label: 'Zaplanowana' },
  { value: 'pending_forms', label: 'Oczekuje na formularze' },
  { value: 'completed', label: 'Zakończona' },
  { value: 'cancelled', label: 'Anulowana' },
]

function VisitDetailPage() {
  const { appointment: initial, isOwner } = Route.useLoaderData()
  const navigate = useNavigate()
  const apt = initial as any
  const [status, setStatus] = useState(apt.status)
  const [notes, setNotes] = useState(apt.notes ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    const result = await updateAppointmentFn({
      data: { id: apt.id, status, notes: notes || null },
    })
    setSaving(false)
    if (result?.error) toast.error(result.error)
    else toast.success('Wizyta zaktualizowana')
  }

  async function handleDelete() {
    if (!confirm('Usunąć tę wizytę?')) return
    const result = await deleteAppointmentFn({ data: { id: apt.id } })
    if (result?.error) toast.error(result.error)
    else {
      toast.success('Wizyta usunięta')
      navigate({ to: '/dashboard/visits' })
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to="/dashboard/visits"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Wizyty
        </Link>
        {isOwner && (
          <button
            onClick={handleDelete}
            className="text-sm text-destructive hover:bg-destructive/10 px-3 py-1.5 rounded-lg"
          >
            Usuń
          </button>
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => isOwner && setStatus(e.target.value)}
              disabled={!isOwner}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground outline-none disabled:opacity-60"
            >
              {statusOptions.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Notatki
          </label>
          <textarea
            value={notes}
            onChange={(e) => isOwner && setNotes(e.target.value)}
            readOnly={!isOwner}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground outline-none resize-none disabled:opacity-60"
            placeholder="Dodatkowe informacje o wizycie…"
          />
        </div>

        {isOwner && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Zapisywanie…' : 'Zapisz zmiany'}
          </button>
        )}
      </div>

      <VisitPhotos appointment={apt} />
    </div>
  )
}
