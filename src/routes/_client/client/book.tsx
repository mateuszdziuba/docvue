import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { format, addDays } from 'date-fns'
import { pl } from 'date-fns/locale'
import { toast } from 'sonner'
import { getTreatmentsFn } from '@/src/server/treatments'
import { findAvailableSlotsFn } from '@/src/server/availability'
import { bookAsClientFn } from '@/src/server/appointments'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'

interface Treatment {
  id: string
  name: string
  description: string | null
  duration_minutes: number
  price: number | null
}

interface AvailableSlot {
  start: string
  end: string
}

export const Route = createFileRoute('/_client/client/book')({
  component: ClientBookPage,
})

function ClientBookPage() {
  const router = useRouter()
  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [selectedTreatment, setSelectedTreatment] = useState<Treatment | null>(null)
  const [slots, setSlots] = useState<AvailableSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!loaded) {
      setLoading(true)
      getTreatmentsFn({ data: { query: '' } })
        .then((r) => {
          setTreatments((r.treatments || []) as Treatment[])
          setLoaded(true)
        })
        .finally(() => setLoading(false))
    }
  }, [loaded])

  const loadSlots = async (treatment: Treatment) => {
    setSelectedTreatment(treatment)
    setLoading(true)
    const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd')
    const result = await findAvailableSlotsFn({
      data: {
        salonId: '',
        date: tomorrow,
        durationMinutes: treatment.duration_minutes,
      },
    })
    setSlots(result.slots || [])
    setLoading(false)
  }

  const handleBook = async (slot: AvailableSlot, treatment: Treatment) => {
    const result = await bookAsClientFn({
      data: {
        treatmentId: treatment.id,
        startTime: slot.start,
      },
    })
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Wizyta umówiona! Sprawdź szczegóły w zakładce Wizyty.')
      setSelectedTreatment(null)
      setSlots([])
      router.invalidate()
    }
  }

  if (loading && !loaded) {
    return (
      <div className="space-y-6">
        <PageHeader title="Rezerwacja wizyty" description="Wybierz zabieg i termin" />
        <Card className="p-6">
          <p className="text-sm text-muted-foreground text-center py-8">Ładowanie zabiegów...</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rezerwacja wizyty"
        description="Wybierz zabieg i dogodny termin"
      />

      {treatments.length === 0 && !loading && (
        <EmptyState
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
          title="Brak zabiegów"
          description="Gabinet nie dodał jeszcze żadnych zabiegów. Skontaktuj się z gabinetem."
        />
      )}

      {!selectedTreatment && treatments.length > 0 && (
        <div className="grid gap-3">
          {treatments.map((t) => (
            <Card
              key={t.id}
              className="p-4 cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => loadSlots(t)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-foreground text-sm">{t.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t.duration_minutes} min
                    {t.price ? ` · ${t.price} zł` : ''}
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="text-xs">Wybierz</Button>
              </div>
              {t.description && (
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{t.description}</p>
              )}
            </Card>
          ))}
        </div>
      )}

      {selectedTreatment && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="sm" onClick={() => setSelectedTreatment(null)}>
              ← Wstecz
            </Button>
            <div>
              <p className="text-sm font-medium text-foreground">{selectedTreatment.name}</p>
              <p className="text-xs text-muted-foreground">
                {format(addDays(new Date(), 1), 'EEEE, d MMMM', { locale: pl })}
              </p>
            </div>
          </div>

          {loading && (
            <Card className="p-6">
              <p className="text-sm text-muted-foreground text-center py-4">Sprawdzanie terminów...</p>
            </Card>
          )}

          {!loading && slots.length === 0 && (
            <Card className="p-6">
              <div className="text-center py-8">
                <p className="text-muted-foreground text-sm">Brak wolnych terminów na jutro.</p>
                <Button variant="outline" onClick={() => setSelectedTreatment(null)} className="mt-4">
                  Wybierz inny zabieg
                </Button>
              </div>
            </Card>
          )}

          {!loading && slots.length > 0 && (
            <div className="grid gap-2">
              {slots.map((slot) => (
                <Card
                  key={slot.start}
                  className="p-3 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {format(new Date(slot.start), 'HH:mm')} — {format(new Date(slot.end), 'HH:mm')}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => handleBook(slot, selectedTreatment)}>
                    Rezerwuj
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
