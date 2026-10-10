'use client'

import { ImagePlus, Link as LinkIcon, Loader2, Package, Search } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import {
  addProductFromUrlFn,
  type CatalogProduct,
  createCustomProductFn,
  createProductImageUploadFn,
  getCatalogProductsFn,
  setProductImageFn,
} from '@/src/server/products'

interface ProductPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Wybrany/dodany kosmetyk wraca do edytora planu. */
  onPick: (product: CatalogProduct) => void
}

type Tab = 'catalog' | 'url' | 'custom'

const priceFormatter = new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' })

export function ProductPickerDialog({ open, onOpenChange, onPick }: ProductPickerDialogProps) {
  const [tab, setTab] = useState<Tab>('catalog')

  // Z bazy
  const [query, setQuery] = useState('')
  const [catalog, setCatalog] = useState<CatalogProduct[]>([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogError, setCatalogError] = useState<string | null>(null)

  // Przez URL
  const [url, setUrl] = useState('')
  const [urlBusy, setUrlBusy] = useState(false)

  // Ręcznie
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [usage, setUsage] = useState('')
  const [availableInSalon, setAvailableInSalon] = useState(false)
  const [customBusy, setCustomBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

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

  useEffect(() => {
    if (!open || tab !== 'catalog') return
    const timer = window.setTimeout(() => void loadCatalog(query), 250)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab, query])

  const resetForms = () => {
    setQuery('')
    setUrl('')
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

  const handleAddFromUrl = async () => {
    if (!/^https?:\/\//i.test(url.trim())) {
      toast.error('Podaj poprawny adres URL (http:// lub https://)')
      return
    }
    setUrlBusy(true)
    try {
      const result = await addProductFromUrlFn({ data: { url: url.trim() } })
      if ('error' in result && result.error) {
        toast.error(result.error)
        return
      }
      const product = (result as { product: CatalogProduct }).product
      toast.success(
        (result as { existed?: boolean }).existed
          ? 'Kosmetyk już był w bazie — dodano do planu'
          : 'Pobrano dane i zapisano w bazie',
      )
      onPick(product)
      handleOpenChange(false)
    } catch {
      toast.error('Nie udało się dodać kosmetyku')
    } finally {
      setUrlBusy(false)
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
            [
              ['catalog', 'Z bazy'],
              ['url', 'Przez URL'],
              ['custom', 'Ręcznie'],
            ] as Array<[Tab, string]>
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
          <div className="space-y-3">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Szukaj kosmetyku (nazwa lub link)…"
                className="pl-9"
                autoFocus
              />
            </div>

            {catalogError ? (
              <p className="rounded-xl border border-dashed border-border/60 p-4 text-center text-sm text-muted-foreground">
                {catalogError}
              </p>
            ) : catalogLoading ? (
              <div className="flex justify-center py-8">
                <Loader2
                  className="h-5 w-5 animate-spin text-muted-foreground"
                  aria-hidden="true"
                />
              </div>
            ) : catalog.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border/60 p-4 text-center text-sm text-muted-foreground">
                {query
                  ? 'Brak wyników.'
                  : 'Baza jest pusta — dodaj kosmetyk przez URL lub ręcznie.'}
              </p>
            ) : (
              <ul className="max-h-[45vh] space-y-2 overflow-y-auto pr-1">
                {catalog.map((product) => (
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
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://..."
                  autoFocus
                />
                <Button
                  type="button"
                  onClick={() => void handleAddFromUrl()}
                  disabled={!url.trim() || urlBusy}
                >
                  {urlBusy ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : null}
                  {urlBusy ? 'Pobieranie…' : 'Pobierz i zapisz'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Dane (nazwa, zdjęcie, cena) zostaną pobrane i zapisane w bazie — następnym razem
                wystarczy wybrać kosmetyk z bazy. Gdy sklep blokuje pobieranie, dodaj kosmetyk
                ręcznie.
              </p>
            </div>
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
