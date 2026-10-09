'use client'

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ChevronDown,
  Copy,
  GripVertical,
  Link as LinkIcon,
  Loader2,
  Moon,
  Plus,
  Sun,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
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
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Link } from '@/lib/link-compat'
import { useRouterCompat } from '@/lib/router-compat'
import type { TimeOfDay } from '@/src/lib/beauty-plan-diff'
import { saveBeautyPlanFn, scrapeProductFn } from '@/src/server/beauty-plans'
import { DeleteIconButton } from './delete-icon-button'

export type BeautyPlanProductInitial = {
  id?: string
  name: string
  url: string
  imageUrl?: string | null
  price: number | null
  usageDescription: string
  availableInSalon?: boolean
}

type BeautyPlanProductDraft = BeautyPlanProductInitial & {
  draftId: string
  availableInSalon: boolean
}

interface BeautyPlanEditorProps {
  clientId: string
  planId?: string
  initialMorningDesc?: string
  initialEveningDesc?: string
  initialMorningProducts?: BeautyPlanProductInitial[]
  initialEveningProducts?: BeautyPlanProductInitial[]
  clientName?: string | null
  onSaved?: () => void | Promise<void>
}

function toDrafts(products: BeautyPlanProductInitial[]): BeautyPlanProductDraft[] {
  return products.map((product) => ({
    ...product,
    availableInSalon: Boolean(product.availableInSalon),
    draftId: crypto.randomUUID(),
  }))
}

function newDraft(): BeautyPlanProductDraft {
  return {
    draftId: crypto.randomUUID(),
    name: '',
    url: '',
    price: null,
    usageDescription: '',
    availableInSalon: false,
  }
}

interface SortableProductCardProps {
  time: TimeOfDay
  index: number
  product: BeautyPlanProductDraft
  expanded: boolean
  isScraping: boolean
  scrapeError?: string
  onToggle: () => void
  onRemove: () => void
  onCopy: () => void
  onFetch: () => void
  onChange: (
    field: keyof BeautyPlanProductInitial | 'availableInSalon',
    value: string | number | boolean | null,
  ) => void
}

const PRICE_FORMATTER = new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' })

function SortableProductCard({
  time,
  index,
  product,
  expanded,
  isScraping,
  scrapeError,
  onToggle,
  onRemove,
  onCopy,
  onFetch,
  onChange,
}: SortableProductCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: product.draftId,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
  }

  const fieldId = (field: string) => `${time}-product-${product.draftId}-${field}`
  const bodyId = `${time}-product-${product.draftId}-body`
  const otherLabel = time === 'morning' ? 'wieczora' : 'rana'
  const priceLabel = product.price !== null ? PRICE_FORMATTER.format(product.price) : null

  return (
    <Collapsible open={expanded} onOpenChange={onToggle} asChild>
      <div
        ref={setNodeRef}
        style={style}
        className={`overflow-hidden rounded-xl border border-border/60 bg-muted/30 ${
          isDragging ? 'shadow-lg ring-2 ring-primary/30' : ''
        }`}
      >
        {/* Nagłówek (zwinięta wersja) — obrazek, nazwa, cena; łatwy do przeciągania */}
        <div className="flex items-center gap-1 p-2 sm:gap-2 sm:p-3">
          <button
            type="button"
            className="grid h-11 w-9 shrink-0 cursor-grab touch-none place-items-center rounded-md text-muted-foreground hover:text-foreground active:cursor-grabbing"
            aria-label={`Przenieś produkt ${index + 1} (${time === 'morning' ? 'rano' : 'wieczór'})`}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" aria-hidden="true" />
          </button>

          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-left"
            >
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt=""
                  className="h-8 w-8 shrink-0 rounded-md border border-border/50 bg-background object-cover"
                />
              ) : (
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-border/50 bg-muted/40 text-muted-foreground">
                  <LinkIcon className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
                </span>
              )}
              <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {index + 1}.
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                {product.name.trim() || 'Nowy kosmetyk'}
              </span>
              {product.availableInSalon && (
                <span className="hidden shrink-0 rounded-full bg-success-container px-2 py-0.5 text-[11px] font-medium text-on-success-container sm:inline-flex">
                  W gabinecie
                </span>
              )}
              {priceLabel && (
                <span className="shrink-0 text-sm font-semibold text-on-success-container">
                  {priceLabel}
                </span>
              )}
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                  expanded ? 'rotate-180' : ''
                }`}
                aria-hidden="true"
              />
            </button>
          </CollapsibleTrigger>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-11 shrink-0 gap-1.5 px-2 text-xs text-muted-foreground"
            onClick={onCopy}
            title={`Kopiuj do ${otherLabel}`}
          >
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Kopiuj do {otherLabel}</span>
          </Button>
          <DeleteIconButton
            label={`Usuń produkt ${index + 1} (${time === 'morning' ? 'rano' : 'wieczór'})`}
            className="h-11 w-11 shrink-0"
            onClick={onRemove}
          />
        </div>

        {/* Rozwinięte pola produktu */}
        <CollapsibleContent>
          <div id={bodyId} className="space-y-3 border-t border-border/50 p-4 pt-3">
            <div className="flex gap-4">
              {product.imageUrl ? (
                <div className="hidden h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border/50 bg-background sm:block">
                  <img
                    src={product.imageUrl}
                    alt={product.name || 'Zdjęcie produktu'}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/40 text-muted-foreground sm:flex">
                  <LinkIcon className="h-5 w-5 opacity-50" />
                </div>
              )}

              <div className="flex-1">
                <Label
                  htmlFor={fieldId('url')}
                  className="mb-1.5 flex items-center gap-1 text-xs font-medium text-muted-foreground"
                >
                  <LinkIcon className="h-3 w-3" aria-hidden="true" />
                  Link do sklepu
                </Label>
                <div className="flex gap-2">
                  <Input
                    id={fieldId('url')}
                    type="url"
                    value={product.url}
                    onChange={(event) => onChange('url', event.target.value)}
                    placeholder="https://..."
                    aria-invalid={scrapeError ? true : undefined}
                    aria-describedby={scrapeError ? `${fieldId('url')}-error` : undefined}
                    className="min-h-11 rounded-lg md:min-h-0"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="min-h-11 shrink-0 md:min-h-0"
                    disabled={!product.url || isScraping}
                    onClick={onFetch}
                  >
                    {isScraping ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      'Pobierz dane'
                    )}
                  </Button>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Automatyczne pobieranie danych działa dla większości sklepów. Jeśli się nie uda —
                  wpisz dane ręcznie.
                </p>
                {scrapeError && (
                  <p id={`${fieldId('url')}-error`} className="mt-1.5 text-xs text-destructive">
                    {scrapeError}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="md:col-span-3">
                <Label
                  htmlFor={fieldId('name')}
                  className="mb-1.5 text-xs font-medium text-muted-foreground"
                >
                  Nazwa produktu
                </Label>
                <Input
                  id={fieldId('name')}
                  type="text"
                  value={product.name}
                  onChange={(event) => onChange('name', event.target.value)}
                  placeholder="Np. CeraVe Oczyszczający żel"
                  maxLength={200}
                  className="min-h-11 rounded-lg md:min-h-0"
                />
              </div>
              <div className="md:col-span-1">
                <Label
                  htmlFor={fieldId('price')}
                  className="mb-1.5 text-xs font-medium text-muted-foreground"
                >
                  Cena (PLN)
                </Label>
                <Input
                  id={fieldId('price')}
                  type="number"
                  min="0"
                  step="0.01"
                  value={product.price ?? ''}
                  onChange={(event) => {
                    const parsed = Number.parseFloat(event.target.value)
                    onChange('price', Number.isFinite(parsed) ? parsed : null)
                  }}
                  placeholder="0.00"
                  className="min-h-11 rounded-lg md:min-h-0"
                />
              </div>
            </div>

            <label
              htmlFor={fieldId('salon')}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border/60 bg-background/60 px-3 py-2"
            >
              <Checkbox
                id={fieldId('salon')}
                checked={product.availableInSalon}
                onCheckedChange={(checked) => onChange('availableInSalon', checked === true)}
              />
              <span className="text-sm text-foreground">
                Dostępne w gabinecie — klient może kupić na miejscu
              </span>
            </label>

            <div>
              <Label
                htmlFor={fieldId('usage')}
                className="mb-1.5 text-xs font-medium text-muted-foreground"
              >
                Instrukcja użycia dla klienta (opcjonalnie)
              </Label>
              <Textarea
                id={fieldId('usage')}
                value={product.usageDescription}
                onChange={(event) => onChange('usageDescription', event.target.value)}
                rows={2}
                placeholder="Np. Wklep delikatnie w okolice oka..."
                className="resize-none rounded-lg"
              />
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

export function BeautyPlanEditor({
  clientId,
  planId,
  initialMorningDesc = '',
  initialEveningDesc = '',
  initialMorningProducts = [],
  initialEveningProducts = [],
  clientName,
  onSaved,
}: BeautyPlanEditorProps) {
  const router = useRouterCompat()
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [morningDesc, setMorningDesc] = useState(initialMorningDesc)
  const [eveningDesc, setEveningDesc] = useState(initialEveningDesc)
  const [morningProducts, setMorningProducts] = useState<BeautyPlanProductDraft[]>(() =>
    toDrafts(initialMorningProducts),
  )
  const [eveningProducts, setEveningProducts] = useState<BeautyPlanProductDraft[]>(() =>
    toDrafts(initialEveningProducts),
  )

  const [scrapingKey, setScrapingKey] = useState<string | null>(null)
  const [scrapeErrors, setScrapeErrors] = useState<Record<string, string>>({})
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const toggleExpanded = (draftId: string) => {
    setExpandedIds((previous) => {
      const next = new Set(previous)
      if (next.has(draftId)) next.delete(draftId)
      else next.add(draftId)
      return next
    })
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const initialSnapshot = JSON.stringify({
    morningDesc: initialMorningDesc,
    eveningDesc: initialEveningDesc,
    morningProducts: initialMorningProducts,
    eveningProducts: initialEveningProducts,
  })
  const currentSnapshot = JSON.stringify({
    morningDesc,
    eveningDesc,
    morningProducts: morningProducts.map(({ draftId: _draftId, ...rest }) => rest),
    eveningProducts: eveningProducts.map(({ draftId: _draftId, ...rest }) => rest),
  })
  const isDirty = currentSnapshot !== initialSnapshot

  const getProducts = (time: TimeOfDay) => (time === 'morning' ? morningProducts : eveningProducts)

  const mutateProducts = (
    time: TimeOfDay,
    updater: (products: BeautyPlanProductDraft[]) => BeautyPlanProductDraft[],
  ) => {
    if (time === 'morning') setMorningProducts(updater)
    else setEveningProducts(updater)
  }

  const backToClient = () => router.push(`/dashboard/clients/${clientId}`)

  const handleCancel = () => {
    if (isDirty) {
      setConfirmCloseOpen(true)
      return
    }
    backToClient()
  }

  const handleDiscard = () => {
    setConfirmCloseOpen(false)
    backToClient()
  }

  // Ostrzeżenie przy zamykaniu karty z niezapisanymi zmianami (Baymard)
  useEffect(() => {
    if (!isDirty) return
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  const handleAddProduct = (time: TimeOfDay) => {
    const draft = newDraft()
    mutateProducts(time, (products) => [...products, draft])
    // Nowy produkt od razu rozwinięty do uzupełnienia
    setExpandedIds((previous) => new Set(previous).add(draft.draftId))
  }

  const handleRemoveProduct = (time: TimeOfDay, index: number) => {
    mutateProducts(time, (products) => products.filter((_, productIndex) => productIndex !== index))
  }

  const handleCopyProduct = (time: TimeOfDay, index: number) => {
    const source = getProducts(time)[index]
    if (!source) return
    const target: TimeOfDay = time === 'morning' ? 'evening' : 'morning'
    const copy = { ...source, id: undefined, draftId: crypto.randomUUID() }
    mutateProducts(target, (products) => [...products, copy])
    setExpandedIds((previous) => new Set(previous).add(copy.draftId))
    toast.success(target === 'morning' ? 'Skopiowano do rana' : 'Skopiowano do wieczora')
  }

  const handleProductChange = (
    time: TimeOfDay,
    index: number,
    field: keyof BeautyPlanProductInitial | 'availableInSalon',
    value: string | number | boolean | null,
  ) => {
    mutateProducts(time, (products) =>
      products.map((product, productIndex) =>
        productIndex === index ? { ...product, [field]: value } : product,
      ),
    )
  }

  const handleDragEnd = (time: TimeOfDay) => (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    mutateProducts(time, (products) => {
      const oldIndex = products.findIndex((product) => product.draftId === active.id)
      const newIndex = products.findIndex((product) => product.draftId === over.id)
      if (oldIndex < 0 || newIndex < 0) return products
      return arrayMove(products, oldIndex, newIndex)
    })
  }

  const handleFetchData = async (time: TimeOfDay, index: number) => {
    const key = `${time}-${index}`
    const product = getProducts(time)[index]
    const url = product?.url.trim() ?? ''

    if (!/^https?:\/\//i.test(url)) {
      setScrapeErrors((previous) => ({
        ...previous,
        [key]: 'Podaj poprawny adres URL (http:// lub https://)',
      }))
      return
    }

    setScrapingKey(key)
    setScrapeErrors((previous) => ({ ...previous, [key]: '' }))

    try {
      const result = await scrapeProductFn({ data: { url } })
      if ('error' in result && result.error) {
        const message = result.error
        setScrapeErrors((previous) => ({ ...previous, [key]: message }))
        toast.error(message)
        return
      }

      const scraped = result as {
        name?: string | null
        imageUrl?: string | null
        price?: number | null
      }
      mutateProducts(time, (products) =>
        products.map((item, productIndex) =>
          productIndex === index
            ? {
                ...item,
                name: scraped.name || item.name,
                imageUrl: scraped.imageUrl || item.imageUrl,
                price: scraped.price ?? item.price,
              }
            : item,
        ),
      )
      toast.success('Pobrano dane produktu')
    } catch {
      const message = 'Nie udało się pobrać danych produktu. Wpisz je ręcznie.'
      setScrapeErrors((previous) => ({ ...previous, [key]: message }))
      toast.error(message)
    } finally {
      setScrapingKey(null)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const products = [
      ...morningProducts.map((product, index) => ({
        id: product.id,
        timeOfDay: 'morning' as const,
        name: product.name,
        url: product.url || null,
        imageUrl: product.imageUrl || null,
        price: product.price,
        usageDescription: product.usageDescription || null,
        availableInSalon: product.availableInSalon,
        position: index,
      })),
      ...eveningProducts.map((product, index) => ({
        id: product.id,
        timeOfDay: 'evening' as const,
        name: product.name,
        url: product.url || null,
        imageUrl: product.imageUrl || null,
        price: product.price,
        usageDescription: product.usageDescription || null,
        availableInSalon: product.availableInSalon,
        position: index,
      })),
    ]

    if (products.some((product) => !product.name.trim() || product.name.trim().length > 200)) {
      toast.error('Każdy produkt musi mieć nazwę (maksymalnie 200 znaków)')
      return
    }
    if (products.length > 50) {
      toast.error('Maksymalnie 50 produktów w planie pielęgnacyjnym')
      return
    }
    if (products.some((product) => product.url && !/^https?:\/\//i.test(product.url))) {
      toast.error('Adresy produktów muszą zaczynać się od http:// lub https://')
      return
    }

    setIsSaving(true)
    try {
      const result = await saveBeautyPlanFn({
        data: {
          clientId,
          morningDescription: morningDesc,
          eveningDescription: eveningDesc,
          products,
        },
      })

      if ('error' in result && result.error) {
        toast.error(result.error)
        return
      }

      toast.success(planId ? 'Zaktualizowano plan pielęgnacyjny' : 'Utworzono plan pielęgnacyjny')
      await onSaved?.()
      backToClient()
    } catch {
      toast.error('Nie udało się zapisać planu. Spróbuj ponownie.')
    } finally {
      setIsSaving(false)
    }
  }

  const renderProductSection = (time: TimeOfDay, products: BeautyPlanProductDraft[]) => (
    <div className="space-y-4">
      {products.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
          Brak kosmetyków. Dodaj pierwszy produkt.
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd(time)}
        >
          <SortableContext
            items={products.map((product) => product.draftId)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {products.map((product, index) => {
                const key = `${time}-${index}`
                return (
                  <SortableProductCard
                    key={product.draftId}
                    time={time}
                    index={index}
                    product={product}
                    expanded={expandedIds.has(product.draftId)}
                    isScraping={scrapingKey === key}
                    scrapeError={scrapeErrors[key]}
                    onToggle={() => toggleExpanded(product.draftId)}
                    onRemove={() => handleRemoveProduct(time, index)}
                    onCopy={() => handleCopyProduct(time, index)}
                    onFetch={() => void handleFetchData(time, index)}
                    onChange={(field, value) => handleProductChange(time, index, field, value)}
                  />
                )
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={() => handleAddProduct(time)}
        className="min-h-11 w-full border-dashed text-xs md:min-h-10"
      >
        <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
        Dodaj kosmetyk
      </Button>
    </div>
  )

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <Link
          href={`/dashboard/clients/${clientId}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Wróć do klienta
        </Link>
        <h1 className="mt-2 font-serif text-2xl font-normal tracking-tight text-foreground">
          {planId ? 'Edytuj plan pielęgnacyjny' : 'Nowy plan pielęgnacyjny'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {clientName ? `${clientName} · ` : ''}
          Uzupełnij zalecenia na rano i wieczór oraz dodaj kosmetyki wraz z instrukcją użycia.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4 rounded-2xl border border-warning/30 bg-warning-container/50 p-5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-warning-container text-on-warning-container">
              <Sun className="h-4 w-4" aria-hidden="true" />
            </div>
            <h2 className="text-lg font-bold text-on-warning-container">Pielęgnacja poranna</h2>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="morning-description"
              className="text-sm font-medium text-muted-foreground"
            >
              Wskazówki / opis rutyny
            </Label>
            <Textarea
              id="morning-description"
              value={morningDesc}
              onChange={(event) => setMorningDesc(event.target.value)}
              rows={3}
              placeholder="Np. 1. Oczyszczanie, 2. Tonizacja, 3. Krem z filtrem..."
              className="rounded-xl px-4 py-3"
            />
          </div>

          {renderProductSection('morning', morningProducts)}
        </div>

        <div className="space-y-4 rounded-2xl border border-info/30 bg-info-container/50 p-5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-info-container text-on-info-container">
              <Moon className="h-4 w-4" aria-hidden="true" />
            </div>
            <h2 className="text-lg font-bold text-on-info-container">Pielęgnacja wieczorna</h2>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="evening-description"
              className="text-sm font-medium text-muted-foreground"
            >
              Wskazówki / opis rutyny
            </Label>
            <Textarea
              id="evening-description"
              value={eveningDesc}
              onChange={(event) => setEveningDesc(event.target.value)}
              rows={3}
              placeholder="Np. 1. Demakijaż, 2. Mycie twarzy, 3. Serum z retinolem..."
              className="rounded-xl px-4 py-3"
            />
          </div>

          {renderProductSection('evening', eveningProducts)}
        </div>

        <div className="sticky bottom-4 z-10 flex justify-end gap-3 rounded-xl border border-border bg-background/95 px-4 py-3 shadow-sm backdrop-blur">
          <Button type="button" variant="ghost" onClick={handleCancel}>
            Anuluj
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Zapisywanie...
              </>
            ) : (
              'Zapisz plan'
            )}
          </Button>
        </div>
      </form>

      <AlertDialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Niezapisane zmiany</AlertDialogTitle>
            <AlertDialogDescription>
              Masz niezapisane zmiany w planie pielęgnacyjnym. Czy na pewno chcesz je odrzucić?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Wróć do edycji</AlertDialogCancel>
            <AlertDialogAction
              aria-label="Odrzuć niezapisane zmiany"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDiscard}
            >
              Odrzuć zmiany
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
