import { Link } from '@tanstack/react-router'
import { CheckCircle2, ClipboardList, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface RequiredForm {
  id: string
  title: string
  description: string | null
  filled: boolean
  token?: string
  fillUrl?: string
}

interface ChatRequiredFormsCardProps {
  status?: 'scheduled' | 'pending_forms'
  forms?: RequiredForm[]
  onRequestForms: () => void
}

export function ChatRequiredFormsCard({
  status,
  forms,
  onRequestForms,
}: ChatRequiredFormsCardProps) {
  if (forms && forms.length > 0) {
    const hasFillLinks = forms.some((form) => !form.filled && (form.fillUrl ?? form.token))
    return (
      <Card className="p-4 mt-2">
        <p className="label-caps text-muted-foreground mb-2">
          {hasFillLinks ? 'Wypełnij formularze przed wizytą' : 'Wymagane formularze'}
        </p>
        <ul className="space-y-2">
          {forms.map((form) => {
            const fillUrl = form.fillUrl ?? (form.token ? `/f/${form.token}` : null)
            if (fillUrl && !form.filled) {
              return (
                <li key={form.id}>
                  <Button asChild variant="secondary" size="lg" className="w-full whitespace-normal text-left">
                    <Link to={fillUrl}>
                      <FileText className="h-4 w-4" />
                      Wypełnij formularz: {form.title}
                    </Link>
                  </Button>
                </li>
              )
            }
            return (
              <li key={form.id} className="flex items-center gap-2 text-sm">
                {form.filled ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                ) : (
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span className={cn('flex-1', form.filled && 'line-through text-muted-foreground')}>
                  {form.title}
                </span>
                {form.filled && <span className="text-xs text-muted-foreground">Wypełniony</span>}
              </li>
            )
          })}
        </ul>
      </Card>
    )
  }

  if (status === 'pending_forms') {
    return (
      <Card className="p-4 mt-2 border-primary/25">
        <p className="label-caps text-muted-foreground mb-2">Wymagane formularze</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Przed wizytą wymagane jest wypełnienie formularzy.
        </p>
        <Button className="mt-3 min-h-11" onClick={onRequestForms}>
          <ClipboardList className="h-4 w-4" />
          Wypełnij wymagane formularze
        </Button>
      </Card>
    )
  }

  return null
}
