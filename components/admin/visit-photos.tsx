'use client'

import { Download, ImagePlus, Loader2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useRouterCompat } from '@/lib/router-compat'
import { createClient } from '@/lib/supabase/client'
import {
  createVisitPhotoUploadFn,
  getVisitPhotoUrlFn,
  setVisitPhotoFn,
} from '@/src/server/appointments'

interface VisitPhotosProps {
  appointment: any
}

type PhotoKind = 'before' | 'after'

const MAX_PHOTO_SIZE = 10 * 1024 * 1024

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Nie udało się wczytać zdjęcia'))
    image.src = src
  })
}

function SliderCompare({
  before,
  after,
  position,
  onPositionChange,
}: {
  before: string
  after: string
  position: number
  onPositionChange: (value: number) => void
}) {
  return (
    <div
      className="relative select-none overflow-hidden rounded-lg border border-border"
      style={{ touchAction: 'none' }}
    >
      <img src={before} alt="Przed" className="block w-full" />
      <img
        src={after}
        alt="Po"
        className="absolute inset-0 h-full w-full object-cover"
        style={{ clipPath: `inset(0 0 0 ${position}%)` }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 w-0.5 bg-background/90 shadow-[0_0_8px_rgba(0,0,0,0.35)]"
        style={{ left: `${position}%` }}
        aria-hidden="true"
      />
      <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-background/85 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground">
        Przed
      </span>
      <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-background/85 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground">
        Po
      </span>
      <input
        type="range"
        min={0}
        max={100}
        value={position}
        onChange={(event) => onPositionChange(Number(event.target.value))}
        aria-label="Suwak porównania przed / po"
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
      />
    </div>
  )
}

export function VisitPhotos({ appointment }: VisitPhotosProps) {
  const beforeRef = useRef<HTMLInputElement>(null)
  const afterRef = useRef<HTMLInputElement>(null)
  const router = useRouterCompat()
  const supabase = createClient()

  const [urls, setUrls] = useState<{ before?: string; after?: string }>({})
  const [busy, setBusy] = useState<PhotoKind | null>(null)
  const [removing, setRemoving] = useState<PhotoKind | null>(null)
  const [compareMode, setCompareMode] = useState<'side' | 'slider' | null>(null)
  const [savingCompare, setSavingCompare] = useState(false)
  const [savingSlider, setSavingSlider] = useState(false)
  const [sliderPosition, setSliderPosition] = useState(50)

  const beforePath: string | null = appointment.before_photo_path ?? null
  const afterPath: string | null = appointment.after_photo_path ?? null
  const hasBothPhotos = Boolean(beforePath && afterPath)

  useEffect(() => {
    let active = true
    const loadUrls = async () => {
      const next: { before?: string; after?: string } = {}
      const [beforeResult, afterResult] = await Promise.all([
        beforePath
          ? getVisitPhotoUrlFn({ data: { path: beforePath } })
          : Promise.resolve({ url: undefined }),
        afterPath
          ? getVisitPhotoUrlFn({ data: { path: afterPath } })
          : Promise.resolve({ url: undefined }),
      ])
      if ('url' in beforeResult && beforeResult.url) next.before = beforeResult.url
      if ('url' in afterResult && afterResult.url) next.after = afterResult.url
      if (active) setUrls(next)
    }
    void loadUrls()
    return () => {
      active = false
    }
  }, [beforePath, afterPath])

  const handleFile = async (kind: PhotoKind, file: File | undefined) => {
    if (!file) return
    if (file.size > MAX_PHOTO_SIZE) {
      toast.error('Maksymalny rozmiar zdjęcia to 10 MB')
      return
    }
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      toast.error('Dozwolone formaty zdjęć: JPG, PNG lub WEBP')
      return
    }

    setBusy(kind)
    try {
      const prepared = await createVisitPhotoUploadFn({
        data: { id: appointment.id, kind, contentType: file.type },
      })
      if ('error' in prepared && prepared.error) throw new Error(prepared.error)
      if (!('path' in prepared) || !prepared.path || !prepared.token) {
        throw new Error('Nie udało się przygotować wysyłki zdjęcia')
      }

      const { error: uploadError } = await supabase.storage
        .from('visit-photos')
        .uploadToSignedUrl(prepared.path, prepared.token, file, { contentType: file.type })
      if (uploadError) throw new Error('Nie udało się wysłać zdjęcia')

      const saved = await setVisitPhotoFn({
        data: { id: appointment.id, kind, path: prepared.path },
      })
      if ('error' in saved && saved.error) throw new Error(saved.error)

      toast.success(kind === 'before' ? 'Dodano zdjęcie „przed”' : 'Dodano zdjęcie „po”')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nie udało się zapisać zdjęcia')
    } finally {
      setBusy(null)
      if (kind === 'before' && beforeRef.current) beforeRef.current.value = ''
      if (kind === 'after' && afterRef.current) afterRef.current.value = ''
    }
  }

  const handleRemove = async (kind: PhotoKind) => {
    setRemoving(kind)
    try {
      const result = await setVisitPhotoFn({ data: { id: appointment.id, kind, path: null } })
      if ('error' in result && result.error) throw new Error(result.error)
      toast.success('Zdjęcie usunięte')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nie udało się usunąć zdjęcia')
    } finally {
      setRemoving(null)
    }
  }

  const handleDownloadComparison = async () => {
    if (!urls.before || !urls.after) return
    setSavingCompare(true)
    try {
      const [before, after] = await Promise.all([loadImage(urls.before), loadImage(urls.after)])
      const height = Math.max(before.naturalHeight, after.naturalHeight)
      const widthBefore = before.naturalWidth * (height / before.naturalHeight)
      const widthAfter = after.naturalWidth * (height / after.naturalHeight)
      const gap = Math.round(height * 0.015)
      const labelHeight = Math.round(height * 0.075)

      const canvas = document.createElement('canvas')
      canvas.width = Math.round(widthBefore + widthAfter + gap)
      canvas.height = height + labelHeight
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Brak kontekstu canvas')

      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.drawImage(before, 0, labelHeight, widthBefore, height)
      context.drawImage(after, widthBefore + gap, labelHeight, widthAfter, height)

      context.fillStyle = '#1b1c1c'
      context.font = `600 ${Math.max(14, Math.round(labelHeight * 0.55))}px sans-serif`
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.fillText('PRZED', widthBefore / 2, labelHeight / 2)
      context.fillText('PO', widthBefore + gap + widthAfter / 2, labelHeight / 2)

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.92),
      )
      if (!blob) throw new Error('Nie udało się zapisać obrazu')

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `docvue-porownanie-${appointment.id}.jpg`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      toast.success('Zapisano porównanie')
    } catch {
      toast.error('Nie udało się zapisać porównania zdjęć')
    } finally {
      setSavingCompare(false)
    }
  }

  const handleDownloadSliderComparison = async () => {
    if (!urls.before || !urls.after) return
    setSavingSlider(true)
    try {
      const [before, after] = await Promise.all([loadImage(urls.before), loadImage(urls.after)])
      const width = Math.max(before.naturalWidth, after.naturalWidth)
      const height = Math.max(before.naturalHeight, after.naturalHeight)
      const divider = Math.round(width * (sliderPosition / 100))

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Brak kontekstu canvas')

      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, width, height)
      context.drawImage(before, 0, 0, width, height)
      context.save()
      context.beginPath()
      context.rect(divider, 0, width - divider, height)
      context.clip()
      context.drawImage(after, 0, 0, width, height)
      context.restore()

      // Linia suwaka i etykiety — jak w podglądzie
      context.fillStyle = 'rgba(255,255,255,0.9)'
      context.fillRect(Math.max(0, divider - 1), 0, 2, height)

      const labelSize = Math.max(14, Math.round(height * 0.035))
      const pillPaddingX = Math.round(labelSize * 0.8)
      const pillPaddingY = Math.round(labelSize * 0.45)
      const pillHeight = labelSize + pillPaddingY * 2
      const pillRadius = pillHeight / 2
      const pillTop = Math.round(labelSize * 0.8)
      const drawPill = (text: string, side: 'left' | 'right') => {
        context.font = `600 ${labelSize}px sans-serif`
        context.textBaseline = 'middle'
        const textWidth = context.measureText(text).width
        const pillWidth = textWidth + pillPaddingX * 2
        const x = side === 'left' ? pillTop : width - pillTop - pillWidth
        context.fillStyle = 'rgba(255,255,255,0.85)'
        context.beginPath()
        context.roundRect(x, pillTop, pillWidth, pillHeight, pillRadius)
        context.fill()
        context.fillStyle = '#1b1c1c'
        context.textAlign = 'center'
        context.fillText(text, x + pillWidth / 2, pillTop + pillHeight / 2)
      }
      drawPill('PRZED', 'left')
      drawPill('PO', 'right')

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.92),
      )
      if (!blob) throw new Error('Nie udało się zapisać obrazu')

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `docvue-porownanie-suwak-${appointment.id}.jpg`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      toast.success('Zapisano porównanie')
    } catch {
      toast.error('Nie udało się zapisać porównania zdjęć')
    } finally {
      setSavingSlider(false)
    }
  }

  const renderPhoto = (
    kind: PhotoKind,
    label: string,
    path: string | null,
    ref: typeof beforeRef,
  ) => {
    const url = kind === 'before' ? urls.before : urls.after
    const isBusy = busy === kind
    const isRemoving = removing === kind

    return (
      <div>
        <p className="label-caps text-muted-foreground mb-2">{label}</p>
        {path ? (
          <div className="relative">
            {url ? (
              <img
                src={url}
                alt={label}
                className="w-full aspect-square rounded-lg border border-border object-cover"
              />
            ) : (
              <div className="grid aspect-square w-full place-items-center rounded-lg border border-border bg-muted/40">
                <Loader2
                  className="h-5 w-5 animate-spin text-muted-foreground"
                  aria-hidden="true"
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => void handleRemove(kind)}
              disabled={isRemoving}
              aria-label={`Usuń zdjęcie „${label}”`}
              className="absolute right-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-full bg-background/90 text-muted-foreground shadow-sm transition-colors hover:text-destructive disabled:opacity-50"
            >
              {isRemoving ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <X className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => ref.current?.click()}
            disabled={isBusy}
            className="h-auto aspect-square w-full flex-col gap-2 rounded-lg border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary"
          >
            {isBusy ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            ) : (
              <ImagePlus className="h-5 w-5" aria-hidden="true" />
            )}
            {isBusy ? 'Wysyłanie…' : '+ Dodaj zdjęcie'}
          </Button>
        )}
        <input
          ref={ref}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => void handleFile(kind, event.target.files?.[0])}
        />
      </div>
    )
  }

  return (
    <div className="bg-card rounded-lg border border-border p-5 space-y-4">
      <h2 className="font-medium text-foreground">Zdjęcia przed / po</h2>
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {renderPhoto('before', 'Przed', beforePath, beforeRef)}
        {renderPhoto('after', 'Po', afterPath, afterRef)}
      </div>

      {hasBothPhotos && (
        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCompareMode('side')}
            disabled={!urls.before || !urls.after}
          >
            Porównaj obok siebie
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCompareMode('slider')}
            disabled={!urls.before || !urls.after}
          >
            Porównanie suwakiem
          </Button>
        </div>
      )}

      <Dialog open={compareMode !== null} onOpenChange={(open) => !open && setCompareMode(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {compareMode === 'slider' ? 'Porównanie suwakiem' : 'Zdjęcia obok siebie'}
            </DialogTitle>
            <DialogDescription>
              {compareMode === 'slider'
                ? 'Przesuń suwak, aby zobaczyć, jak zdjęcia się nakładają.'
                : 'Podgląd zdjęć „przed” i „po” oraz zapis porównania do pliku.'}
            </DialogDescription>
          </DialogHeader>

          {compareMode === 'slider' && urls.before && urls.after && (
            <SliderCompare
              before={urls.before}
              after={urls.after}
              position={sliderPosition}
              onPositionChange={setSliderPosition}
            />
          )}

          {compareMode === 'side' && urls.before && urls.after && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="label-caps mb-1.5 text-muted-foreground">Przed</p>
                <img
                  src={urls.before}
                  alt="Przed"
                  className="w-full rounded-lg border border-border object-cover"
                />
              </div>
              <div>
                <p className="label-caps mb-1.5 text-muted-foreground">Po</p>
                <img
                  src={urls.after}
                  alt="Po"
                  className="w-full rounded-lg border border-border object-cover"
                />
              </div>
            </div>
          )}

          {compareMode === 'side' && (
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={() => void handleDownloadComparison()}
                disabled={savingCompare || !urls.before || !urls.after}
              >
                {savingCompare ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
                )}
                {savingCompare ? 'Zapisywanie…' : 'Pobierz porównanie'}
              </Button>
            </div>
          )}

          {compareMode === 'slider' && (
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={() => void handleDownloadSliderComparison()}
                disabled={savingSlider || !urls.before || !urls.after}
              >
                {savingSlider ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
                )}
                {savingSlider ? 'Zapisywanie…' : 'Pobierz w tym ustawieniu'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
