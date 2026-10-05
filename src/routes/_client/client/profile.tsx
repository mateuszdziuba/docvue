import { createFileRoute, Link } from '@tanstack/react-router'
import { format, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'
import { MessageCircle, Moon, Package, Sun, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { cn } from '@/lib/utils'
import { getMyBeautyPlanFn } from '@/src/server/beauty-plans'
import { getClientProfileFn } from '@/src/server/client-portal-data'

type BeautyPlanRow = {
  id: string
  morning_description: string | null
  evening_description: string | null
  updated_at: string
}

type BeautyPlanProductRow = {
  id: string
  time_of_day: 'morning' | 'evening'
  name: string
  url: string | null
  image_url: string | null
  price: number | null
  usage_description: string | null
}

export const Route = createFileRoute('/_client/client/profile')({
  loader: async () => {
    const [profile, beautyPlan] = await Promise.all([getClientProfileFn(), getMyBeautyPlanFn()])
    return {
      ...profile,
      beautyPlan: (beautyPlan.plan ?? null) as BeautyPlanRow | null,
      beautyProducts: (beautyPlan.products ?? []) as BeautyPlanProductRow[],
    }
  },
  component: ClientProfilePage,
})

const statusLabels: Record<string, string> = {
  scheduled: 'Zaplanowana',
  pending_forms: 'Wymaga formularzy',
  completed: 'Zakończona',
  cancelled: 'Anulowana',
}

const statusBadge: Record<string, string> = {
  scheduled: 'bg-surface-container text-on-surface-variant',
  pending_forms: 'bg-primary-container text-on-primary-container',
  completed: 'bg-secondary-container text-secondary-foreground',
  cancelled: 'bg-destructive/10 text-destructive',
}

function NoClientCard() {
  return (
    <Card className="max-w-lg mx-auto w-full flex flex-col items-center justify-center text-center py-12 px-6">
      <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground/60 mb-5">
        <User className="h-6 w-6" />
      </div>
      <h3 className="font-serif text-lg font-normal text-foreground tracking-tight">
        Brak powiązanego profilu klienta
      </h3>
      <p className="text-sm text-muted-foreground mt-1.5 max-w-sm leading-relaxed">
        Nie znaleźliśmy Twojego profilu w żadnym salonie. Skontaktuj się z gabinetem, aby połączyć
        konto z wizytami.
      </p>
    </Card>
  )
}

function BeautyPlanProductList({ products }: { products: BeautyPlanProductRow[] }) {
  if (products.length === 0) {
    return <p className="mt-3 text-sm italic text-muted-foreground">Brak dodanych produktów</p>
  }

  return (
    <ul className="mt-3 space-y-2">
      {products.map((product) => {
        const price = Number.parseFloat(String(product.price ?? ''))
        return (
          <li
            key={product.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-border/60 p-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              {product.image_url ? (
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-border/50 bg-card p-0.5">
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="h-full w-full object-contain mix-blend-multiply dark:mix-blend-normal"
                  />
                </div>
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-success-container text-on-success-container">
                  <Package className="h-5 w-5" />
                </div>
              )}
              <div className="min-w-0">
                {product.url ? (
                  <a
                    href={product.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate text-sm font-medium text-foreground transition-colors hover:text-success"
                  >
                    {product.name}
                  </a>
                ) : (
                  <span className="block truncate text-sm font-medium text-foreground">
                    {product.name}
                  </span>
                )}
                {product.usage_description && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {product.usage_description}
                  </p>
                )}
              </div>
            </div>
            {Number.isFinite(price) && (
              <span className="shrink-0 text-sm font-semibold text-on-success-container">
                {price.toFixed(2).replace('.', ',')} zł
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function ClientBeautyPlanSection({
  plan,
  products,
}: {
  plan: BeautyPlanRow
  products: BeautyPlanProductRow[]
}) {
  const morningProducts = products.filter((product) => product.time_of_day === 'morning')
  const eveningProducts = products.filter((product) => product.time_of_day === 'evening')

  return (
    <section className="space-y-3">
      <h2 className="label-caps text-muted-foreground">Plan pielęgnacyjny</h2>
      <Card className="divide-y divide-border">
        <div className="p-4">
          <div className="flex items-center gap-2">
            <Sun className="h-4 w-4 text-warning" />
            <h3 className="text-sm font-semibold text-foreground">Rano</h3>
          </div>
          <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
            {plan.morning_description || 'Brak wskazówek'}
          </p>
          <BeautyPlanProductList products={morningProducts} />
        </div>
        <div className="p-4">
          <div className="flex items-center gap-2">
            <Moon className="h-4 w-4 text-info" />
            <h3 className="text-sm font-semibold text-foreground">Wieczorem</h3>
          </div>
          <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
            {plan.evening_description || 'Brak wskazówek'}
          </p>
          <BeautyPlanProductList products={eveningProducts} />
        </div>
      </Card>
    </section>
  )
}

function EmptyHistory() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground/60 mb-5">
        <MessageCircle className="h-6 w-6" />
      </div>
      <h3 className="font-serif text-lg font-normal text-foreground tracking-tight">
        Nie masz jeszcze historii wizyt
      </h3>
      <p className="text-sm text-muted-foreground mt-1.5 max-w-sm leading-relaxed">
        Każda podróż zaczyna się od pierwszego kroku — napisz do asystenta na czacie, a pomoże Ci
        umówić pierwszą wizytę w salonie.
      </p>
      <Button asChild size="lg" className="mt-6">
        <Link to="/client/chat">Umów pierwszą wizytę przez czat</Link>
      </Button>
    </div>
  )
}

function ClientProfilePage() {
  const { client, history, error, beautyPlan, beautyProducts } = Route.useLoaderData()

  if (error === 'no_client' || !client) {
    return (
      <div className="space-y-6">
        <PageHeader title="Profil" description="Twoje dane i historia wizyt." />
        <NoClientCard />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Profil" description="Twoje dane i historia wizyt." />

      <Card className="p-6 flex items-center gap-4">
        <div className="h-14 w-14 shrink-0 rounded-full bg-primary-container flex items-center justify-center text-primary font-serif text-xl">
          {client.name.charAt(0)}
        </div>
        <div className="min-w-0">
          <h2 className="font-serif text-xl font-normal text-foreground tracking-tight">
            {client.name}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5 truncate">{client.email}</p>
          {client.phone && <p className="text-sm text-muted-foreground truncate">{client.phone}</p>}
        </div>
      </Card>

      <section className="space-y-3">
        <h2 className="label-caps text-muted-foreground">Historia wizyt</h2>
        <Card>
          {history.length > 0 ? (
            <ul className="divide-y divide-border">
              {history.map((apt) => (
                <li key={apt.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">
                      {apt.treatments?.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(parseISO(apt.start_time), 'd MMMM yyyy, HH:mm', { locale: pl })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant="secondary"
                      className={cn('rounded-full', statusBadge[apt.status])}
                    >
                      {statusLabels[apt.status] ?? apt.status}
                    </Badge>
                    {apt.status === 'completed' && (
                      <Link
                        to="/client/chat"
                        className="inline-flex items-center h-11 px-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors whitespace-nowrap"
                      >
                        Umów ponownie
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyHistory />
          )}
        </Card>
      </section>

      {beautyPlan && <ClientBeautyPlanSection plan={beautyPlan} products={beautyProducts} />}
    </div>
  )
}
