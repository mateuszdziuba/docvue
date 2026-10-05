import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import { CalendarDays, Clock, Loader2, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface ChatBookingSummaryProps {
  treatment: {
    name: string
    duration_minutes: number
    price: number | null
    salon_name: string
    salon_address: string
  }
  slot: { start: string }
  isBooking: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ChatBookingSummary({
  treatment,
  slot,
  isBooking,
  onConfirm,
  onCancel,
}: ChatBookingSummaryProps) {
  const start = new Date(slot.start)
  const dateLabel = format(start, 'EEEE, d MMMM yyyy', { locale: pl })
  const timeLabel = format(start, 'HH:mm')
  const location = [treatment.salon_name, treatment.salon_address].filter(Boolean).join(', ')

  return (
    <Card className="p-4 border-primary/20 shadow-sm">
      <p className="label-caps text-muted-foreground mb-3">Podsumowanie wizyty</p>
      <div className="space-y-2 text-sm">
        <div>
          <p className="font-serif text-lg text-foreground tracking-tight">{treatment.name}</p>
          <p className="text-muted-foreground mt-0.5">
            {treatment.duration_minutes} min
            {treatment.price != null ? ` · ${treatment.price} zł` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
          <span className="capitalize">{dateLabel}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4 shrink-0 text-primary" />
          <span>{timeLabel}</span>
        </div>
        {location && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">{location}</span>
          </div>
        )}
      </div>
      <div className="mt-4 flex items-center gap-2">
        <Button className="flex-1" size="lg" onClick={onConfirm} disabled={isBooking}>
          {isBooking ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Rezerwuję...
            </>
          ) : (
            'Potwierdzam wizytę'
          )}
        </Button>
        <Button variant="ghost" size="lg" onClick={onCancel} disabled={isBooking}>
          Wróć
        </Button>
      </div>
    </Card>
  )
}
