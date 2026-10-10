'use client'

import {
  ImagePlus,
  Link as LinkIcon,
  Loader2,
  Package,
  Pencil,
  RefreshCw,
  Search,
} from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
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
  type CatalogProduct,
  createProductImageUploadFn,
  deleteCatalogProductFn,
  refreshCatalogProductFn,
  setProductImageFn,
  updateCatalogProductFn,
} from '@/src/server/products'
import { DeleteIconButton } from './delete-icon-button'

interface ProductsListProps {
  initialProducts: CatalogProduct[]
  initialError?: string | null
  isOwner?: boolean
}

const priceFormatter = new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' })

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('pl-PL')
}

export function ProductsList({
  initialProducts,
  initialError,
  isOwner = false,
}: ProductsListProps) {
  const [products, setProducts] = useState(initialProducts)
  const [query, setQuery] = useState('')
  const [refreshingId, setRefreshingId] = useState<string | null>(null)
  const [editing, setEditing] = useState<CatalogProduct | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase()
    if (!search) return products
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(search) ||
        (product.url ?? '').toLowerCase().includes(search),
    )
  }, [products, query])

  const handleRefresh = async (product: CatalogProduct) => {
    if (!product.url) return
    setRefreshingId(product.id)
    try {
      const result = await refreshCatalogProductFn({ data: { id: product.id } })
      if ('error' in result && result.error) {
        toast.error(result.error)
        return
      }
      const updated = (result as { product: CatalogProduct }).product
      setProducts((previous) => previous.map((item) => (item.id === updated.id ? updated : item)))
      toast.success('Zaktualizowano dane kosmetyku')
    } catch {
      toast.error('Nie udało się odświeżyć danych')
    } finally {
      setRefreshingId(null)
    }
  }

  const handleDelete = async () => {
    if (!deletingId) return
    setIsDeleting(true)
    try {
      const result = await deleteCatalogProductFn({ data: { id: deletingId } })
      if ('error' in result && result.error) {
        toast.error(result.error)
        return
      }
      setProducts((previous) => previous.filter((item) => item.id !== deletingId))
      toast.success('Kosmetyk usunięty z bazy')
      setDeletingId(null)
    } catch {
      toast.error('Nie udało się usunąć kosmetyku')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSaved = (updated: CatalogProduct) => {
    setProducts((previous) => previous.map((item) => (item.id === updated.id ? updated : item)))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="relative w-full sm:max-w-sm">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Szukaj kosmetyku (nazwa lub link)…"
            className="pl-9"
            aria-label="Szukaj kosmetyku"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {products.length} {products.length === 1 ? 'kosmetyk' : 'kosmetyków'} w bazie
        </p>
      </div>

      {initialError ? (
        <p className="rounded-xl border border-dashed border-border/60 bg-card p-6 text-center text-sm text-muted-foreground">
          {initialError}
        </p>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/60 bg-card p-6 text-center text-sm text-muted-foreground">
          {query
            ? 'Brak wyników.'
            : 'Baza jest pusta. Dodaj kosmetyki w edytorze planu pielęgnacyjnego (Z bazy → Przez URL / Ręcznie).'}
        </p>
      ) : (
        <ul className="grid gap-3">
          {filtered.map((product) => (
            <li
              key={product.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-card p-3 sm:flex-nowrap sm:gap-4 sm:p-4"
            >
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-lg border border-border/50 bg-background object-contain p-0.5"
                />
              ) : (
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-muted/60 text-muted-foreground">
                  <Package className="h-5 w-5" aria-hidden="true" />
                </span>
              )}

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{product.name}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span
                    className={
                      product.source === 'url'
                        ? 'rounded-full bg-info-container px-2 py-0.5 font-medium text-on-info-container'
                        : 'rounded-full bg-muted px-2 py-0.5 font-medium'
                    }
                  >
                    {product.source === 'url' ? 'Z URL' : 'Ręcznie'}
                  </span>
                  {product.available_in_salon && (
                    <span className="rounded-full bg-success-container px-2 py-0.5 font-medium text-on-success-container">
                      W gabinecie
                    </span>
                  )}
                  <span>Odświeżono: {formatDate(product.last_refreshed_at)}</span>
                  {product.url && (
                    <a
                      href={product.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 hover:text-foreground"
                    >
                      <LinkIcon className="h-3 w-3" aria-hidden="true" />
                      Link
                    </a>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {product.price !== null && (
                  <span className="mr-1 text-sm font-semibold text-on-success-container">
                    {priceFormatter.format(product.price)}
                  </span>
                )}
                {product.url && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-10 gap-1.5"
                    onClick={() => void handleRefresh(product)}
                    disabled={refreshingId === product.id}
                    aria-label={`Odśwież dane ${product.name}`}
                  >
                    {refreshingId === product.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    <span className="hidden sm:inline">Odśwież</span>
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="min-h-10 gap-1.5"
                  onClick={() => setEditing(product)}
                  aria-label={`Edytuj ${product.name}`}
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">Edytuj</span>
                </Button>
                {isOwner && (
                  <DeleteIconButton
                    label={`Usuń ${product.name} z bazy`}
                    className="h-10 w-10"
                    onClick={() => setDeletingId(product.id)}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <ProductEditDialog
          product={editing}
          open
          onOpenChange={(open) => !open && setEditing(null)}
          onSaved={(updated) => {
            handleSaved(updated)
            setEditing(null)
          }}
        />
      )}

      <AlertDialog open={deletingId !== null} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usuń kosmetyk z bazy</AlertDialogTitle>
            <AlertDialogDescription>
              Kosmetyk zniknie z bazy, ale plany pielęgnacyjne zachowają swoje kopie (nazwy, ceny i
              zdjęcia w planach się nie zmienią).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault()
                void handleDelete()
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Usuwanie…' : 'Usuń'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function ProductEditDialog({
  product,
  open,
  onOpenChange,
  onSaved,
}: {
  product: CatalogProduct
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (product: CatalogProduct) => void
}) {
  const [name, setName] = useState(product.name)
  const [url, setUrl] = useState(product.url ?? '')
  const [price, setPrice] = useState(product.price === null ? '' : String(product.price))
  const [usage, setUsage] = useState(product.usage_description ?? '')
  const [availableInSalon, setAvailableInSalon] = useState(product.available_in_salon)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleImageUpload = async (file: File | undefined) => {
    if (!file) return
    setIsUploadingImage(true)
    try {
      const prepared = await createProductImageUploadFn({
        data: { productId: product.id, contentType: file.type },
      })
      if ('error' in prepared && prepared.error) {
        toast.error(prepared.error)
        return
      }
      if (!('path' in prepared) || !prepared.path || !prepared.token) return
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .uploadToSignedUrl(prepared.path, prepared.token, file, { contentType: file.type })
      if (uploadError) {
        toast.error('Nie udało się wysłać zdjęcia')
        return
      }
      const saved = await setProductImageFn({ data: { id: product.id, path: prepared.path } })
      if ('product' in saved && saved.product) {
        toast.success('Zdjęcie zaktualizowane')
        onSaved(saved.product)
      }
    } catch {
      toast.error('Nie udało się zaktualizować zdjęcia')
    } finally {
      setIsUploadingImage(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    try {
      const parsedPrice = Number.parseFloat(price)
      const result = await updateCatalogProductFn({
        data: {
          id: product.id,
          name: name.trim(),
          url: url.trim() || null,
          price: Number.isFinite(parsedPrice) ? parsedPrice : null,
          usageDescription: usage.trim() || null,
          availableInSalon,
        },
      })
      if ('error' in result && result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Kosmetyk zaktualizowany')
      onSaved((result as { product: CatalogProduct }).product)
    } catch {
      toast.error('Nie udało się zapisać zmian')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edytuj kosmetyk</DialogTitle>
          <DialogDescription>Zmień dane lub wymień zdjęcie.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-3">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt=""
                className="h-14 w-14 rounded-lg border border-border/50 bg-background object-contain p-0.5"
              />
            ) : (
              <span className="grid h-14 w-14 place-items-center rounded-lg bg-muted/60 text-muted-foreground">
                <Package className="h-6 w-6" aria-hidden="true" />
              </span>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={isUploadingImage}
              className="min-h-11"
            >
              {isUploadingImage ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <ImagePlus className="mr-1.5 h-4 w-4" aria-hidden="true" />
              )}
              {isUploadingImage ? 'Wysyłanie…' : 'Wymień zdjęcie'}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) => void handleImageUpload(event.target.files?.[0])}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="product-name">Nazwa *</Label>
            <Input
              id="product-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="product-url">Link do sklepu</Label>
            <Input
              id="product-url"
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="product-price">Cena (PLN)</Label>
            <Input
              id="product-price"
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="product-usage">Instrukcja użycia (opcjonalnie)</Label>
            <Textarea
              id="product-usage"
              value={usage}
              onChange={(event) => setUsage(event.target.value)}
              rows={2}
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

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Anuluj
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Zapisywanie...
                </>
              ) : (
                'Zapisz zmiany'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
