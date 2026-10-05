import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface Treatment {
  id: string
  name: string
  description: string | null
  duration_minutes: number
  price: number | null
  salon_id: string
  salon_name: string
  salon_address: string
}

interface ChatTreatmentCardProps {
  treatments: Treatment[]
  onSelect: (treatment: Treatment) => void
}

export function ChatTreatmentCard({ treatments, onSelect }: ChatTreatmentCardProps) {
  return (
    <div className="space-y-2 my-2">
      {treatments.map((t) => (
        <Card
          key={t.id}
          className="p-4 cursor-pointer hover:border-primary/40 transition-colors group"
          onClick={() => onSelect(t)}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                {t.name}
              </h4>
              {t.description && (
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                  {t.description}
                </p>
              )}
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span>{t.duration_minutes} min</span>
                {t.price && <span>{t.price} zł</span>}
                <span className="truncate">{t.salon_name}</span>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="shrink-0 text-xs">
              Wybierz
            </Button>
          </div>
        </Card>
      ))}
    </div>
  )
}
