'use client'

import { Link as LinkIcon, Loader2, Moon, Plus, Sun } from 'lucide-react'
import { useState } from 'react'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { TimeOfDay } from '@/src/lib/beauty-plan-diff'
import { saveBeautyPlanFn, scrapeProductFn } from '@/src/server/beauty-plans'
import { DeleteIconButton } from './delete-icon-button'

export type BeautyPlanProductDraft = {
  id?: string
  name: string
  url: string
  imageUrl?: string | null
  price: number | null
  usageDescription: string
}

interface EditBeautyPlanDialogProps {
  clientId: string
  planId?: string
  initialMorningDesc?: string
  initialEveningDesc?: string
  initialMorningProducts?: BeautyPlanProductDraft[]
  initialEveningProducts?: BeautyPlanProductDraft[]
  trigger?: React.ReactNode
  onSaved?: () => void | Promise<void>
}

function cloneProducts(products: BeautyPlanProductDraft[]): BeautyPlanProductDraft[] {
  return products.map((product) => ({ ...product }))
}

export function EditBeautyPlanDialog({
  clientId,
  planId,
  initialMorningDesc = '',
  initialEveningDesc = '',
  initialMorningProducts = [],
  initialEveningProducts = [],
  trigger,
  onSaved,
}: EditBeautyPlanDialogProps) {
  const [open, setOpen] = useState(false)
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [morningDesc, setMorningDesc] = useState(initialMorningDesc)
  const [eveningDesc, setEveningDesc] = useState(initialEveningDesc)
  const [morningProducts, setMorningProducts] = useState<BeautyPlanProductDraft[]>(() =>
    cloneProducts(initialMorningProducts),
  )
  const [eveningProducts, setEveningProducts] = useState<BeautyPlanProductDraft[]>(() =>
    cloneProducts(initialEveningProducts),
  )

  const [scrapingKey, setScrapingKey] = useState<string | null>(null)
  const [scrapeErrors, setScrapeErrors] = useState<Record<string, string>>({})

  const initialSnapshot = JSON.stringify({
    morningDesc: initialMorningDesc,
    eveningDesc: initialEveningDesc,
    morningProducts: initialMorningProducts,
    eveningProducts: initialEveningProducts,
  })
  const currentSnapshot = JSON.stringify({
    morningDesc,
    eveningDesc,
    morningProducts,
    eveningProducts,
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

  const resetDraft = () => {
    setMorningDesc(initialMorningDesc)
    setEveningDesc(initialEveningDesc)
    setMorningProducts(cloneProducts(initialMorningProducts))
    setEveningProducts(cloneProducts(initialEveningProducts))
    setScrapeErrors({})
    setScrapingKey(null)
  }

  const handleOpenChange = (next: boolean) => {
    if (next) {
      resetDraft()
      setOpen(true)
      return
    }
    if (isDirty) {
      setConfirmCloseOpen(true)
      return
    }
    setOpen(false)
  }

  const handleDiscard = () => {
    resetDraft()
    setConfirmCloseOpen(false)
    setOpen(false)
  }

  const handleAddProduct = (time: TimeOfDay) => {
    mutateProducts(time, (products) => [
      ...products,
      { name: '', url: '', price: null, usageDescription: '' },
    ])
  }

  const handleRemoveProduct = (time: TimeOfDay, index: number) => {
    mutateProducts(time, (products) => products.filter((_, productIndex) => productIndex !== index))
  }

  const handleProductChange = (
    time: TimeOfDay,
    index: number,
    field: keyof BeautyPlanProductDraft,
    value: string | number | null,
  ) => {
    mutateProducts(time, (products) =>
      products.map((product, productIndex) =>
        productIndex === index ? { ...product, [field]: value } : product,
      ),
    )
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
      ...morningProducts.map((product) => ({
        id: product.id,
        timeOfDay: 'morning' as const,
        name: product.name,
        url: product.url || null,
        imageUrl: product.imageUrl || null,
        price: product.price,
        usageDescription: product.usageDescription || null,
      })),
      ...eveningProducts.map((product) => ({
        id: product.id,
        timeOfDay: 'evening' as const,
        name: product.name,
        url: product.url || null,
        imageUrl: product.imageUrl || null,
        price: product.price,
        usageDescription: product.usageDescription || null,
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
      setOpen(false)
    } catch {
      toast.error('Nie udało się zapisać planu. Spróbuj ponownie.')
    } finally {
      setIsSaving(false)
    }
  }

  const renderProductSection = (time: TimeOfDay, products: BeautyPlanProductDraft[]) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Kosmetyki ({time === 'morning' ? 'Rano' : 'Wieczór'})
        </h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11 text-xs md:min-h-0"
          onClick={() => handleAddProduct(time)}
        >
          <Plus className="mr-1 h-3 w-3" aria-hidden="true" />
          Dodaj kosmetyk
        </Button>
      </div>

      {products.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
          Brak kosmetyków. Dodaj pierwszy produkt.
        </p>
      ) : (
        <div className="space-y-4">
          {products.map((product, index) => {
            const key = `${time}-${index}`
            const fieldId = (field: string) => `${time}-product-${index}-${field}`
            const isScraping = scrapingKey === key
            const scrapeError = scrapeErrors[key]

            return (
              <div
                key={key}
                className="space-y-3 rounded-xl border border-border/60 bg-muted/30 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Produkt {index + 1}
                  </span>
                  <DeleteIconButton
                    label={`Usuń produkt ${index + 1} (${time === 'morning' ? 'rano' : 'wieczór'})`}
                    className="h-11 w-11 md:h-8 md:w-8"
                    onClick={() => handleRemoveProduct(time, index)}
                  />
                </div>

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
                        onChange={(event) =>
                          handleProductChange(time, index, 'url', event.target.value)
                        }
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
                        onClick={() => void handleFetchData(time, index)}
                      >
                        {isScraping ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                          'Pobierz dane'
                        )}
                      </Button>
                    </div>
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
                      onChange={(event) =>
                        handleProductChange(time, index, 'name', event.target.value)
                      }
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
                        handleProductChange(
                          time,
                          index,
                          'price',
                          Number.isFinite(parsed) ? parsed : null,
                        )
                      }}
                      placeholder="0.00"
                      className="min-h-11 rounded-lg md:min-h-0"
                    />
                  </div>
                </div>

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
                    onChange={(event) =>
                      handleProductChange(time, index, 'usageDescription', event.target.value)
                    }
                    rows={2}
                    placeholder="Np. Wklep delikatnie w okolicę oka..."
                    className="resize-none rounded-lg"
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          {trigger ?? (
            <Button variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Utwórz plan pielęgnacyjny
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="text-2xl font-bold text-foreground">
              {planId ? 'Edytuj plan pielęgnacyjny' : 'Nowy plan pielęgnacyjny'}
            </DialogTitle>
            <DialogDescription>
              Uzupełnij zalecenia na rano i wieczór oraz dodaj kosmetyki wraz z instrukcją użycia.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-6 px-6 pt-4 pb-6">
              <div className="space-y-4 rounded-2xl border border-warning/30 bg-warning-container/50 p-5">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-warning-container text-on-warning-container">
                    <Sun className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <h2 className="text-lg font-bold text-on-warning-container">
                    Pielęgnacja poranna
                  </h2>
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
                  <h2 className="text-lg font-bold text-on-info-container">
                    Pielęgnacja wieczorna
                  </h2>
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
            </div>

            <div className="sticky bottom-0 z-10 flex justify-end gap-3 border-t border-border bg-background/95 px-6 py-4 backdrop-blur">
              <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
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
        </DialogContent>
      </Dialog>

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
    </>
  )
}
