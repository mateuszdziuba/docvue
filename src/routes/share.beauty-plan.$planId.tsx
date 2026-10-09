import { createFileRoute, Link } from '@tanstack/react-router'
import { ExternalLink, Heart, Moon, Package, Sun } from 'lucide-react'
import { DocvueLogo } from '@/components/ui/docvue-logo'
import type { BeautyPlanProduct } from '@/src/server/beauty-plans'
import { getPublicBeautyPlanFn } from '@/src/server/beauty-plans'

export const Route = createFileRoute('/share/beauty-plan/$planId')({
  loader: async ({ params }) => {
    return await getPublicBeautyPlanFn({ data: { planId: params.planId } })
  },
  head: () => ({
    meta: [
      { title: 'Plan pielęgnacyjny — docvue' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: SharedBeautyPlanPage,
})

const priceFormatter = new Intl.NumberFormat('pl-PL', {
  style: 'currency',
  currency: 'PLN',
})

function formatPrice(value: unknown): string | null {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''))
  return Number.isFinite(parsed) ? priceFormatter.format(parsed) : null
}

function MissingPlan() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-4 text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
          <Heart className="h-7 w-7" />
        </div>
        <div>
          <h1 className="font-serif text-xl font-normal tracking-tight text-foreground">
            Nie znaleziono planu pielęgnacyjnego
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            Ten link jest nieprawidłowy lub plan został usunięty. Skontaktuj się z gabinetem, aby
            otrzymać nowy link.
          </p>
        </div>
        <div className="pt-4">
          <Link to="/">
            <DocvueLogo className="text-sm" />
          </Link>
        </div>
      </div>
    </div>
  )
}

function ProductCard({ product }: { product: BeautyPlanProduct }) {
  const price = formatPrice(product.price)

  return (
    <li className="flex items-start gap-3 overflow-hidden rounded-2xl border border-border/60 bg-card p-3 shadow-sm break-inside-avoid sm:gap-4 sm:p-4">
      {product.image_url ? (
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border/50 bg-card p-1 sm:h-16 sm:w-16">
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-contain mix-blend-multiply dark:mix-blend-normal"
          />
        </div>
      ) : (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-success-container text-on-success-container sm:h-16 sm:w-16">
          <Package className="h-7 w-7" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        {product.url ? (
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex max-w-full items-start gap-1.5 text-sm font-medium text-foreground transition-colors hover:text-success sm:text-base"
          >
            <span className="min-w-0 break-words">{product.name}</span>
            <ExternalLink
              className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
          </a>
        ) : (
          <span className="break-words text-sm font-medium text-foreground sm:text-base">
            {product.name}
          </span>
        )}
        {price && (
          <p className="mt-0.5 text-sm font-semibold text-on-success-container sm:text-base">
            {price}
          </p>
        )}
        {product.usage_description && (
          <p className="mt-1.5 whitespace-pre-line break-words text-sm leading-relaxed text-muted-foreground">
            {product.usage_description}
          </p>
        )}
      </div>
    </li>
  )
}

function PlanTimeSection({
  title,
  description,
  products,
  tone,
}: {
  title: string
  description: string | null
  products: BeautyPlanProduct[]
  tone: 'morning' | 'evening'
}) {
  const isMorning = tone === 'morning'

  return (
    <section className="rounded-2xl border border-border/60 bg-background p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <div
          className={
            isMorning
              ? 'flex h-8 w-8 items-center justify-center rounded-full bg-warning-container text-on-warning-container'
              : 'flex h-8 w-8 items-center justify-center rounded-full bg-info-container text-on-info-container'
          }
        >
          {isMorning ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </div>
        <h2 className="font-serif text-lg font-normal tracking-tight text-foreground">{title}</h2>
      </div>

      {description ? (
        <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : (
        <p className="text-sm italic text-muted-foreground">Brak dodatkowych wskazówek.</p>
      )}

      {products.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-xl border border-dashed border-border/60 p-4 text-center text-sm text-muted-foreground">
          Brak produktów w tej części planu.
        </p>
      )}
    </section>
  )
}

function SharedBeautyPlanPage() {
  const { plan, products, salonName, clientFirstName } = Route.useLoaderData()

  if (!plan) return <MissingPlan />

  const morningProducts = products.filter((product) => product.time_of_day === 'morning')
  const eveningProducts = products.filter((product) => product.time_of_day === 'evening')

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:py-10 lg:max-w-5xl">
        <header className="rounded-3xl border border-border/60 bg-card p-5 text-center shadow-sm sm:p-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Heart className="h-6 w-6" />
          </div>
          <h1 className="mt-4 font-serif text-xl font-normal tracking-tight text-foreground sm:text-2xl">
            Plan pielęgnacyjny
          </h1>
          {clientFirstName && (
            <p className="mt-1 text-sm text-muted-foreground">
              Przygotowany dla: {clientFirstName}
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            Aktualizacja: {new Date(plan.updated_at).toLocaleDateString('pl-PL')}
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          <PlanTimeSection
            title="Rano"
            description={plan.morning_description}
            products={morningProducts}
            tone="morning"
          />
          <PlanTimeSection
            title="Wieczorem"
            description={plan.evening_description}
            products={eveningProducts}
            tone="evening"
          />
        </div>

        <footer className="flex flex-col items-center gap-2 border-t border-border/60 pt-6 text-center">
          {salonName && (
            <p className="text-sm text-muted-foreground">
              Plan przygotowany przez{' '}
              <span className="font-medium text-foreground">{salonName}</span>
            </p>
          )}
          <Link
            to="/"
            aria-label="Przejdź do strony docvue"
            className="transition-opacity hover:opacity-80"
          >
            <DocvueLogo className="text-base" />
          </Link>
        </footer>
      </div>
    </div>
  )
}
