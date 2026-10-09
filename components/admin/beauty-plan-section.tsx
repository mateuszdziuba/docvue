'use client'

import {
  ExternalLink,
  Heart,
  Loader2,
  Mail,
  Moon,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Sun,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Link } from '@/lib/link-compat'
import {
  type BeautyPlan,
  type BeautyPlanProduct,
  deleteBeautyPlanFn,
  getBeautyPlanFn,
  sendBeautyPlanEmailFn,
} from '@/src/server/beauty-plans'
import type { BeautyPlanProductInitial } from './beauty-plan-editor'
import { DeleteBeautyPlanButton } from './delete-beauty-plan-button'
import { ShareBeautyPlanButton } from './share-beauty-plan-button'

interface BeautyPlanSectionProps {
  clientId: string
  clientEmail?: string | null
}

type LoadState = {
  status: 'loading' | 'error' | 'ready'
  plan: BeautyPlan | null
  products: BeautyPlanProduct[]
  error?: string
}

const priceFormatter = new Intl.NumberFormat('pl-PL', {
  style: 'currency',
  currency: 'PLN',
})

function toPrice(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''))
  return Number.isFinite(parsed) ? parsed : 0
}

function toDraft(product: BeautyPlanProduct): BeautyPlanProductInitial {
  return {
    id: product.id,
    name: product.name,
    url: product.url ?? '',
    imageUrl: product.image_url,
    price: product.price === null ? null : toPrice(product.price),
    usageDescription: product.usage_description ?? '',
    availableInSalon: product.available_in_salon,
  }
}

function productKey(product: BeautyPlanProduct): string {
  return (product.url?.trim() || product.name.trim()).toLowerCase()
}

function ProductList({
  products,
  hidePriceIds,
}: {
  products: BeautyPlanProduct[]
  hidePriceIds?: Set<string>
}) {
  if (products.length === 0) {
    return <p className="mt-4 text-sm italic text-muted-foreground">Brak dodanych produktów</p>
  }

  return (
    <ul className="mt-4 space-y-3">
      {products.map((product) => (
        <li
          key={product.id}
          className="flex items-start justify-between gap-3 rounded-xl border border-border/50 bg-background/50 p-3"
        >
          <div className="flex min-w-0 items-start gap-3">
            {product.image_url ? (
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-border/50 bg-background p-0.5">
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
                  className="inline-flex max-w-full items-start gap-1.5 text-sm font-medium text-foreground transition-colors hover:text-success"
                >
                  <span className="break-words">{product.name}</span>
                  <ExternalLink
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                </a>
              ) : (
                <span className="break-words text-sm font-medium text-foreground">
                  {product.name}
                </span>
              )}
              {product.available_in_salon && (
                <span className="mt-1 inline-flex items-center rounded-full bg-success-container px-2 py-0.5 text-[11px] font-medium text-on-success-container">
                  Można kupić w gabinecie
                </span>
              )}
              {product.usage_description && (
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {product.usage_description}
                </p>
              )}
            </div>
          </div>
          {product.price !== null &&
            product.price !== undefined &&
            !hidePriceIds?.has(product.id) && (
              <span className="shrink-0 text-sm font-semibold text-on-success-container">
                {priceFormatter.format(toPrice(product.price))}
              </span>
            )}
        </li>
      ))}
    </ul>
  )
}

export function BeautyPlanSection({ clientId, clientEmail }: BeautyPlanSectionProps) {
  const [isSendingEmail, setIsSendingEmail] = useState(false)

  const handleSendEmail = async () => {
    setIsSendingEmail(true)
    try {
      const result = await sendBeautyPlanEmailFn({ data: { clientId } })
      if ('error' in result && result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Plan wysłany e-mailem')
    } catch {
      toast.error('Nie udało się wysłać e-maila')
    } finally {
      setIsSendingEmail(false)
    }
  }

  const [state, setState] = useState<LoadState>({
    status: 'loading',
    plan: null,
    products: [],
  })

  const load = useCallback(async () => {
    setState((previous) => ({ ...previous, status: 'loading', error: undefined }))
    try {
      const result = await getBeautyPlanFn({ data: { clientId } })
      if ('error' in result && result.error) {
        setState({ status: 'error', plan: null, products: [], error: result.error })
        return
      }
      setState({
        status: 'ready',
        plan: result.plan as BeautyPlan | null,
        products: (result.products ?? []) as BeautyPlanProduct[],
      })
    } catch {
      setState({
        status: 'error',
        plan: null,
        products: [],
        error: 'Nie udało się pobrać planu pielęgnacyjnego',
      })
    }
  }, [clientId])

  useEffect(() => {
    void load()
  }, [load])

  const handleDelete = useCallback(async () => {
    const result = await deleteBeautyPlanFn({ data: { clientId } })
    if ('error' in result && result.error) return { error: result.error }
    await load()
    return {}
  }, [clientId, load])

  const morningProducts = useMemo(
    () => state.products.filter((product) => product.time_of_day === 'morning'),
    [state.products],
  )
  const eveningProducts = useMemo(
    () => state.products.filter((product) => product.time_of_day === 'evening'),
    [state.products],
  )

  // Ten sam produkt rano i wieczorem liczymy (i pokazujemy cenę) tylko raz.
  const seenProductKeys = new Set<string>()
  const hidePriceIds = new Set<string>()
  const uniqueProducts: BeautyPlanProduct[] = []
  for (const product of [...morningProducts, ...eveningProducts]) {
    const key = productKey(product)
    if (key && seenProductKeys.has(key)) {
      hidePriceIds.add(product.id)
      continue
    }
    if (key) seenProductKeys.add(key)
    uniqueProducts.push(product)
  }

  const hasPrices = uniqueProducts.some(
    (product) => product.price !== null && product.price !== undefined,
  )
  const totalPrice = uniqueProducts.reduce((sum, product) => sum + toPrice(product.price), 0)

  if (state.status === 'loading') {
    return (
      <section
        aria-label="Plan pielęgnacyjny"
        className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm"
      >
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-3 w-56" />
          </div>
        </div>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Skeleton className="h-44 w-full rounded-xl" />
          <Skeleton className="h-44 w-full rounded-xl" />
        </div>
      </section>
    )
  }

  if (state.status === 'error') {
    return (
      <section
        aria-label="Plan pielęgnacyjny"
        className="flex flex-col items-center justify-center space-y-4 rounded-2xl border border-border/60 bg-card p-6 text-center"
      >
        <p className="text-sm text-muted-foreground">
          {state.error ?? 'Nie udało się pobrać planu pielęgnacyjnego'}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="min-h-11 md:min-h-0"
          onClick={() => void load()}
        >
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
          Spróbuj ponownie
        </Button>
      </section>
    )
  }

  if (!state.plan) {
    return (
      <section
        aria-label="Plan pielęgnacyjny"
        className="flex flex-col items-center justify-center space-y-4 rounded-2xl border border-border/60 bg-card p-6 text-center"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Heart className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">Brak planu pielęgnacyjnego</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Ten klient nie ma jeszcze spersonalizowanego planu pielęgnacyjnego.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/dashboard/clients/${clientId}/plan`}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Utwórz plan pielęgnacyjny
          </Link>
        </Button>
      </section>
    )
  }

  const plan = state.plan

  return (
    <section
      aria-label="Plan pielęgnacyjny"
      className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm"
    >
      <div className="flex flex-col justify-between gap-4 border-b border-border/50 bg-gradient-to-r from-background to-muted/20 p-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Heart className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Plan pielęgnacyjny</h2>
            <p className="text-xs text-muted-foreground">
              Ostatnia aktualizacja: {new Date(plan.updated_at).toLocaleDateString('pl-PL')}
            </p>
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto sm:justify-end">
          {hasPrices && (
            <div className="mr-1 flex flex-col items-start sm:items-end">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Koszt planu
              </span>
              <span className="text-lg font-bold text-on-success-container">
                {priceFormatter.format(totalPrice)}
              </span>
            </div>
          )}
          <Button asChild variant="outline" size="sm" className="min-h-11 md:min-h-0">
            <Link
              href={`/dashboard/clients/${clientId}/plan`}
              aria-label="Edytuj plan pielęgnacyjny"
            >
              <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Edytuj
            </Link>
          </Button>
          {clientEmail && (
            <Button
              variant="outline"
              size="sm"
              className="min-h-11 md:min-h-0"
              onClick={() => void handleSendEmail()}
              disabled={isSendingEmail}
              aria-label="Wyślij plan pielęgnacyjny e-mailem"
            >
              {isSendingEmail ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Mail className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              )}
              {isSendingEmail ? 'Wysyłanie…' : 'Wyślij e-mail'}
            </Button>
          )}
          <ShareBeautyPlanButton planId={plan.id} />
          <DeleteBeautyPlanButton onConfirm={handleDelete} />
        </div>
      </div>

      <div className="grid gap-px bg-border/50 md:grid-cols-2">
        <div className="bg-gradient-to-b from-warning-container/60 to-background p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-warning-container text-on-warning-container">
              <Sun className="h-4 w-4" aria-hidden="true" />
            </div>
            <h3 className="text-base font-bold text-on-warning-container">Rano</h3>
          </div>

          <div className="whitespace-pre-wrap text-sm text-muted-foreground">
            {plan.morning_description || <span className="italic opacity-70">Brak wskazówek</span>}
          </div>

          <ProductList products={morningProducts} hidePriceIds={hidePriceIds} />
        </div>

        <div className="bg-gradient-to-b from-info-container/60 to-background p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-info-container text-on-info-container">
              <Moon className="h-4 w-4" aria-hidden="true" />
            </div>
            <h3 className="text-base font-bold text-on-info-container">Wieczorem</h3>
          </div>

          <div className="whitespace-pre-wrap text-sm text-muted-foreground">
            {plan.evening_description || <span className="italic opacity-70">Brak wskazówek</span>}
          </div>

          <ProductList products={eveningProducts} hidePriceIds={hidePriceIds} />
        </div>
      </div>
    </section>
  )
}
