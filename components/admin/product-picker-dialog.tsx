'use client'

import {
  Check,
  ImagePlus,
  Link as LinkIcon,
  Loader2,
  Package,
  Plus,
  Search,
  Store,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { scrapeProductFn } from '@/src/server/beauty-plans'
import {
  type CatalogProduct,
  createCustomProductFn,
  createProductImageUploadFn,
  getCatalogProductsFn,
  saveProductFromUrlFn,
  setProductImageFn,
} from '@/src/server/products'

interface ProductPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Wybrany/dodany kosmetyk wraca do edytora planu (lub katalogu). */
  onPick: (product: CatalogProduct) => void
  /** 'catalog' ukrywa zakładkę „Z bazy" i startuje od „Przez URL". */
  mode?: 'plan' | 'catalog'
}

type Tab = 'catalog' | 'url' | 'custom'

const priceFormatter = new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' })

export function ProductPickerDialog({
  open,
  onOpenChange,
  onPick,
  mode = 'plan',
}: ProductPickerDialogProps) {
  const [tab, setTab] = useState<Tab>(mode === 'catalog' ? 'url' : 'catalog')

  // Z bazy
  const [query, setQuery] = useState('')
  const [onlySalon, setOnlySalon] = useState(false)
  const [catalog, setCatalog] = useState<CatalogProduct[]>([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogError, setCatalogError] = useState<string | null>(null)

  // Przez URL
  const [url, setUrl] = useState('')
  const [urlBusy, setUrlBusy] = useState(false)
  const [urlSaveBusy, setUrlSaveBusy] = useState(false)
  const [urlError, setUrlError] = useState<string | null>(null)
  const [scraped, setScraped] = useState<{
    imageUrl: string | null
    price: number | null
  } | null>(null)
  const [draftName, setDraftName] = useState('')
  const [draftPrice, setDraftPrice] = useState('')
  const [draftUsage, setDraftUsage] = useState('')
  const [draftAvailable, setDraftAvailable] = useState(false)

  // Ręcznie
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [usage, setUsage] = useState('')
  const [availableInSalon, setAvailableInSalon] = useState(false)
  const [customBusy, setCustomBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const visibleCatalog = onlySalon
    ? catalog.filter((product) => product.available_in_salon)
    : catalog

  const supabase = createClient()

  const loadCatalog = async (search: string) => {
    setCatalogLoading(true)
    setCatalogError(null)
    try {
      const result = await getCatalogProductsFn({ data: { query: search, limit: 100 } })
      if ('error' in result && result.error) {
        setCatalogError(result.error)
        setCatalog([])
        return
      }
      setCatalog((result as { products: CatalogProduct[] }).products ?? [])
    } catch {
      setCatalogError('Nie udało się pobrać bazy kosmetyków')
    } finally {
      setCatalogLoading(false)
    }
  }

  const resetUrlFlow = () => {
    setScraped(null)
    setUrlError(null)
    setDraftName('')
    setDraftPrice('')
    setDraftUsage('')
    setDraftAvailable(false)
  }

  useEffect(() => {
    if (!open || tab !== 'catalog') return
    const timer = window.setTimeout(() => void loadCatalog(query), 250)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab, query])

  const resetForms = () => {
    setQuery('')
    setOnlySalon(false)
    setUrl('')
    resetUrlFlow()
    setName('')
    setPrice('')
    setUsage('')
    setAvailableInSalon(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) resetForms()
    onOpenChange(next)
  }

  const handlePickFromCatalog = (product: CatalogProduct) => {
    onPick(product)
    handleOpenChange(false)
  }

  const handleFetchUrl = async () => {
    const trimmed = url.trim()
    if (!/^https?:\/\//i.test(trimmed)) {
      setUrlError('Podaj poprawny adres URL (http:// lub https://)')
      return
    }
    setUrlBusy(true)
    setUrlError(null)
    setScraped(null)
    try {
      const result = await scrapeProductFn({ data: { url: trimmed } })
      if ('error' in result && result.error) {
        setUrlError(result.error)
        return
      }
      const scrapedData = result as {
        name?: string | null
        imageUrl?: string | null
        price?: number | null
      }
      setScraped({
        imageUrl: scrapedData.imageUrl ?? null,
        price: scrapedData.price ?? null,
      })
      setDraftName(scrapedData.name ?? '')
      setDraftPrice(
        scrapedData.price === null || scrapedData.price === undefined
          ? ''
          : String(scrapedData.price),
      )
    } catch {
      setUrlError('Nie udało się pobrać danych produktu')
    } finally {
      setUrlBusy(false)
    }
  }

  const handleSaveUrlProduct = async () => {
    if (!scraped) return
    if (!draftName.trim()) {
      setUrlError('Nazwa kosmetyku jest wymagana')
      return
    }
    setUrlSaveBusy(true)
    setUrlError(null)
    try {
      const parsedPrice = Number.parseFloat(draftPrice)
      const result = await saveProductFromUrlFn({
        data: {
          url: url.trim(),
          name: draftName.trim(),
          imageUrl: scraped.imageUrl,
          price: Number.isFinite(parsedPrice) ? parsedPrice : scraped.price,
          usageDescription: draftUsage.trim() || null,
          availableInSalon: draftAvailable,
        },
      })
      if ('error' in result && result.error) {
        setUrlError(result.error)
        return
      }
      const product = (result as { product: CatalogProduct }).product
      toast.success(
        (result as { existed?: boolean }).existed
          ? 'Zaktualizowano kosmetyk w bazie'
          : 'Zapisano kosmetyk w bazie',
      )
      onPick(product)
      handleOpenChange(false)
    } catch {
      setUrlError('Nie udało się zapisać kosmetyku')
    } finally {
      setUrlSaveBusy(false)
    }
  }

  const handleCreateCustom = async () => {
    if (!name.trim()) {
      toast.error('Nazwa kosmetyku jest wymagana')
      return
    }
    setCustomBusy(true)
    try {
      const parsedPrice = Number.parseFloat(price)
      const created = await createCustomProductFn({
        data: {
          name: name.trim(),
          price: Number.isFinite(parsedPrice) ? parsedPrice : null,
          usageDescription: usage.trim() || null,
          availableInSalon,
        },
      })
      if ('error' in created && created.error) {
        toast.error(created.error)
        return
      }
      let product = (created as { product: CatalogProduct }).product

      // Opcjonalny upload zdjęcia
      const file = fileRef.current?.files?.[0]
      if (file) {
        const prepared = await createProductImageUploadFn({
          data: { productId: product.id, contentType: file.type },
        })
        if ('error' in prepared && prepared.error) {
          toast.error(prepared.error)
        } else if ('path' in prepared && prepared.path && prepared.token) {
          const { error: uploadError } = await supabase.storage
            .from('product-images')
            .uploadToSignedUrl(prepared.path, prepared.token, file, { contentType: file.type })
          if (uploadError) {
            toast.error('Nie udało się wysłać zdjęcia')
          } else {
            const saved = await setProductImageFn({ data: { id: product.id, path: prepared.path } })
            if ('product' in saved && saved.product) product = saved.product
          }
        }
      }

      toast.success('Dodano kosmetyk do bazy')
      onPick(product)
      handleOpenChange(false)
    } catch {
      toast.error('Nie udało się dodać kosmetyku')
    } finally {
      setCustomBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dodaj kosmetyk</DialogTitle>
          <DialogDescription>
            Wybierz z bazy, wklej link do sklepu albo dodaj ręcznie.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 rounded-xl border border-border/60 bg-muted/40 p-1">
          {(
            (mode === 'catalog'
              ? [
                  ['url', 'Przez URL'],
                  ['custom', 'Ręcznie'],
                ]
              : [
                  ['catalog', 'Z bazy'],
                  ['url', 'Przez URL'],
                  ['custom', 'Ręcznie'],
                ]) as Array<[Tab, string]>
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              aria-pressed={tab === value}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                tab === value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'catalog' && (
          <div className="min-h-[300px] space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Szukaj kosmetyku (nazwa lub link)…"
                  className="pl-9 pr-9"
                  autoFocus
                />
                {catalogLoading && (
                  <Loader2
                    className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
                    aria-hidden="true"
                  />
                )}
              </div>
              <Button
                type="button"
                variant={onlySalon ? 'default' : 'outline'}
                size="sm"
                aria-pressed={onlySalon}
                onClick={() => setOnlySalon((previous) => !previous)}
                className="min-h-10 shrink-0 gap-1.5"
                title="Pokaż tylko kosmetyki dostępne w gabinecie"
              >
                <Store className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">W gabinecie</span>
              </Button>
            </div>

            {catalogError ? (
              <p className="rounded-xl border border-dashed border-border/60 p-4 text-center text-sm text-muted-foreground">
                {catalogError}
              </p>
            ) : catalogLoading && catalog.length === 0 ? (
              <ul className="space-y-2" aria-hidden="true">
                {[0, 1, 2, 3].map((row) => (
                  <li
                    key={row}
                    className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3"
                  >
                    <Skeleton className="h-11 w-11 shrink-0 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                    <Skeleton className="h-4 w-14 shrink-0" />
                  </li>
                ))}
              </ul>
            ) : visibleCatalog.length === 0 ? (
              <div className="space-y-3 rounded-xl border border-dashed border-border/60 p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  {onlySalon && catalog.length > 0
                    ? 'Brak kosmetyków dostępnych w gabinecie dla tego wyszukiwania.'
                    : query
                      ? `Brak wyników dla „${query}”.`
                      : 'Baza jest pusta.'}
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (/^https?:\/\//i.test(query.trim())) setUrl(query.trim())
                      setTab('url')
                    }}
                  >
                    <LinkIcon className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                    Dodaj przez URL
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setName(query.trim())
                      setTab('custom')
                    }}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                    Dodaj ręcznie
                  </Button>
                </div>
              </div>
            ) : (
              <ul className="max-h-[45vh] space-y-2 overflow-y-auto pr-1">
                {visibleCatalog.map((product) => (
                  <li key={product.id}>
                    <button
                      type="button"
                      onClick={() => handlePickFromCatalog(product)}
                      className="flex w-full items-center gap-3 rounded-xl border border-border/60 bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/40"
                    >
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt=""
                          className="h-11 w-11 shrink-0 rounded-lg border border-border/50 bg-background object-contain p-0.5"
                        />
                      ) : (
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-muted/60 text-muted-foreground">
                          <Package className="h-5 w-5" aria-hidden="true" />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-foreground">
                          {product.name}
                        </span>
                        {product.available_in_salon && (
                          <span className="mt-0.5 inline-flex rounded-full bg-success-container px-2 py-0.5 text-[11px] font-medium text-on-success-container">
                            W gabinecie
                          </span>
                        )}
                      </span>
                      {product.price !== null && (
                        <span className="shrink-0 text-sm font-semibold text-on-success-container">
                          {priceFormatter.format(product.price)}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {!catalogError && !catalogLoading && visibleCatalog.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1 text-xs text-muted-foreground">
                <span>Nie ma na liście?</span>
                <button
                  type="button"
                  className="font-medium text-primary underline-offset-2 hover:underline"
                  onClick={() => {
                    if (/^https?:\/\//i.test(query.trim())) setUrl(query.trim())
                    setTab('url')
                  }}
                >
                  Dodaj przez URL
                </button>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  className="font-medium text-primary underline-offset-2 hover:underline"
                  onClick={() => {
                    setName(query.trim())
                    setTab('custom')
                  }}
                >
                  Dodaj ręcznie
                </button>
              </div>
            )}
          </div>
        )}

        {tab === 'url' && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="picker-url" className="flex items-center gap-1 text-sm">
                <LinkIcon className="h-3.5 w-3.5" aria-hidden="true" />
                Link do sklepu
              </Label>
              <div className="flex gap-2">
                <Input
                  id="picker-url"
                  type="url"
                  value={url}
                  onChange={(event) => {
                    setUrl(event.target.value)
                    if (scraped || urlError) resetUrlFlow()
                  }}
                  placeholder="https://..."
                  autoFocus
                />
                <Button
                  type="button"
                  variant={scraped ? 'outline' : 'default'}
                  onClick={() => void handleFetchUrl()}
                  disabled={!url.trim() || urlBusy}
                  className="shrink-0"
                >
                  {urlBusy ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : null}
                  {urlBusy ? 'Pobieranie…' : scraped ? 'Pobierz ponownie' : 'Pobierz dane'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Najpierw pobierzemy dane ze strony sklepu, a po Twojej weryfikacji zapiszemy
                kosmetyk w bazie. Gdy sklep blokuje pobieranie, dodaj kosmetyk ręcznie.
              </p>
              {urlError && <p className="text-xs text-destructive">{urlError}</p>}
            </div>

            {scraped && (
              <div className="space-y-3 rounded-xl border border-success/30 bg-success-container/20 p-4">
                <div className="flex items-start gap-3">
                  {scraped.imageUrl ? (
                    <img
                      src={scraped.imageUrl}
                      alt=""
                      className="h-16 w-16 shrink-0 rounded-lg border border-border/50 bg-background object-contain p-0.5"
                    />
                  ) : (
                    <span className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-muted/60 text-muted-foreground">
                      <Package className="h-6 w-6" aria-hidden="true" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="flex items-center gap-1.5 text-xs font-medium text-on-success-container">
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      Pobrano dane — sprawdź i popraw przed zapisaniem
                    </p>
                    <Input
                      value={draftName}
                      onChange={(event) => setDraftName(event.target.value)}
                      placeholder="Nazwa kosmetyku"
                      maxLength={200}
                      aria-label="Nazwa kosmetyku"
                    />
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={draftPrice}
                      onChange={(event) => setDraftPrice(event.target.value)}
                      placeholder="Cena (PLN)"
                      aria-label="Cena kosmetyku"
                    />
                  </div>
                </div>

                <Textarea
                  value={draftUsage}
                  onChange={(event) => setDraftUsage(event.target.value)}
                  rows={2}
                  placeholder="Instrukcja użycia (opcjonalnie)"
                  className="resize-none bg-background"
                  aria-label="Instrukcja użycia"
                />

                <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                  <Checkbox
                    checked={draftAvailable}
                    onCheckedChange={(checked) => setDraftAvailable(checked === true)}
                  />
                  <span className="text-sm text-foreground">
                    Dostępne w gabinecie — klient może kupić na miejscu
                  </span>
                </label>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={() => void handleSaveUrlProduct()}
                    disabled={urlSaveBusy}
                  >
                    {urlSaveBusy ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Check className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    )}
                    {urlSaveBusy ? 'Zapisywanie…' : 'Zapisz w bazie i dodaj'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'custom' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="picker-name">Nazwa *</Label>
                <Input
                  id="picker-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Np. CeraVe Oczyszczający żel"
                  maxLength={200}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="picker-price">Cena (PLN)</Label>
                <Input
                  id="picker-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="picker-usage">Instrukcja użycia (opcjonalnie)</Label>
              <Textarea
                id="picker-usage"
                value={usage}
                onChange={(event) => setUsage(event.target.value)}
                rows={2}
                placeholder="Np. Wklep delikatnie w okolicę oka..."
                className="resize-none"
              />
            </div>

            <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border/60 bg-background/60 px-3 py-2">
              <Checkbox
                checked={availableInSalon}
                onCheckedChange={(checked) => setAvailableInSalon(checked === true)}
              />
              <span className="text-sm text-foreground">
                Dostępne w gabinecie — klient może kupić na miejscu
              </span>
            </label>

            <div className="space-y-2">
              <Label htmlFor="picker-image">Zdjęcie (opcjonalnie)</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileRef.current?.click()}
                  className="min-h-11"
                >
                  <ImagePlus className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Wybierz zdjęcie
                </Button>
                <span className="text-xs text-muted-foreground">
                  JPG, PNG lub WEBP (maks. 5 MB)
                </span>
              </div>
              <input
                ref={fileRef}
                id="picker-image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
              />
            </div>

            <div className="flex justify-end">
              <Button type="button" onClick={() => void handleCreateCustom()} disabled={customBusy}>
                {customBusy ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
                ) : null}
                {customBusy ? 'Dodawanie…' : 'Dodaj do bazy i planu'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
