'use client'

import { Camera, ImagePlus, Loader2, Lock, ShieldCheck, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
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
import { createClient } from '@/lib/supabase/client'
import {
  createConsultationPhotoUploadFn,
  removeConsultationPhotoFn,
  setConsultationPhotoFn,
} from '@/src/server/consultations'

const MAX_FILE_SIZE = 15 * 1024 * 1024
const MAX_EDGE = 1600

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Nie udało się wczytać zdjęcia'))
    image.src = url
  })
}

async function preparePhoto(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
    throw new Error('Dozwolone formaty zdjęć: JPG, PNG lub WEBP')
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Maksymalny rozmiar zdjęcia to 15 MB')
  }

  const url = URL.createObjectURL(file)
  try {
    const image = await loadImage(url)
    const scale = Math.min(1, MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight))
    const width = Math.max(1, Math.round(image.naturalWidth * scale))
    const height = Math.max(1, Math.round(image.naturalHeight * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Nie udało się przygotować zdjęcia')

    context.fillStyle = 'white'
    context.fillRect(0, 0, width, height)
    context.drawImage(image, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.9),
    )
    if (!blob) throw new Error('Nie udało się przygotować zdjęcia')
    return new File([blob], 'face.jpg', { type: 'image/jpeg' })
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function FacePhotoPanel({
  consultationId,
  photoUrl,
  consentAt,
  disabled,
  onPhotoChanged,
}: {
  consultationId: string
  photoUrl: string | null
  consentAt: string | null
  disabled?: boolean
  onPhotoChanged: (url: string | null) => void
}) {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [consent, setConsent] = useState(Boolean(photoUrl))
  const [isUploading, setIsUploading] = useState(false)
  const [removeOpen, setRemoveOpen] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)

  const handleFile = async (file: File | undefined) => {
    if (!file || disabled) return
    if (!consent) {
      toast.error('Zaznacz zgodę na przetwarzanie zdjęcia twarzy')
      return
    }

    setIsUploading(true)
    try {
      const prepared = await preparePhoto(file)
      const target = await createConsultationPhotoUploadFn({
        data: { id: consultationId, contentType: prepared.type },
      })
      if ('error' in target && target.error) throw new Error(target.error)
      if (!('path' in target) || !target.path || !target.token) {
        throw new Error('Nie udało się przygotować wysyłki zdjęcia')
      }

      const { error: uploadError } = await supabase.storage
        .from('consultation-photos')
        .uploadToSignedUrl(target.path, target.token, prepared, {
          contentType: prepared.type,
        })
      if (uploadError) throw new Error('Nie udało się wysłać zdjęcia')

      const saved = await setConsultationPhotoFn({
        data: { id: consultationId, path: target.path, consent: true },
      })
      if ('error' in saved && saved.error) throw new Error(saved.error)
      if ('url' in saved && saved.url) {
        onPhotoChanged(saved.url)
        toast.success('Zdjęcie zostało dodane')
      } else {
        throw new Error('Nie udało się pobrać zdjęcia')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nie udało się dodać zdjęcia')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (cameraInputRef.current) cameraInputRef.current.value = ''
    }
  }

  const handleRemove = async () => {
    setIsRemoving(true)
    try {
      const result = await removeConsultationPhotoFn({ data: { id: consultationId } })
      if ('error' in result && result.error) throw new Error(result.error)
      onPhotoChanged(null)
      setConsent(false)
      setRemoveOpen(false)
      toast.success('Zdjęcie zostało usunięte')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nie udało się usunąć zdjęcia')
    } finally {
      setIsRemoving(false)
    }
  }

  if (photoUrl) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-surface-container-low/60 px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-success" aria-hidden="true" />
          <span>
            Zdjęcie zapisane w prywatnym magazynie
            {consentAt ? ` · zgoda ${new Date(consentAt).toLocaleDateString('pl-PL')}` : ''}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || isUploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <ImagePlus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            )}
            Zmień zdjęcie
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || isUploading}
            onClick={() => setRemoveOpen(true)}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Usuń
          </Button>
        </div>

        <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Usunąć zdjęcie twarzy?</AlertDialogTitle>
              <AlertDialogDescription>
                Usunięte zostanie zdjęcie oraz cała mapa twarzy: rysunki i obserwacje. Tej operacji
                nie można cofnąć.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isRemoving}>Anuluj</AlertDialogCancel>
              <AlertDialogAction
                onClick={(event) => {
                  event.preventDefault()
                  void handleRemove()
                }}
                disabled={isRemoving}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isRemoving ? 'Usuwanie…' : 'Usuń zdjęcie'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-dashed border-border/80 bg-surface-container-low/40 p-5">
      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
            <Camera className="h-5 w-5" aria-hidden="true" />
          </div>
          <h3 className="mt-3 font-serif text-xl text-foreground">Dodaj zdjęcie twarzy</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Zdjęcie frontalne, równomiernie oświetlone, bez zasłoniętej twarzy. Na jego podstawie
            powstanie interaktywna mapa 2.5D do rysowania i opisywania zmian skórnych.
          </p>
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-info/20 bg-info-container/50 px-3 py-2 text-xs leading-relaxed text-on-info-container">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              Zdjęcie jest przetwarzane lokalnie w przeglądarce i zapisywane wyłącznie w prywatnym
              magazynie gabinetu. Nie wysyłamy go do zewnętrznego AI.
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <label
            htmlFor="consultation-photo-consent"
            className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-border/70 bg-background/70 p-3 text-sm leading-relaxed"
          >
            <input
              id="consultation-photo-consent"
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              disabled={disabled || isUploading}
              className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
            />
            <span>
              Klient wyraził zgodę na wykonanie i przechowywanie zdjęcia twarzy w dokumentacji
              gabinetu. Zgoda zostanie zapisana wraz z datą i autorem.
            </span>
          </label>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="user"
            className="hidden"
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              disabled={!consent || disabled || isUploading}
              onClick={() => cameraInputRef.current?.click()}
              className="min-h-11 flex-1"
            >
              {isUploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Camera className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              Zrób zdjęcie
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!consent || disabled || isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="min-h-11 flex-1"
            >
              <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
              Wybierz plik
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            JPG, PNG lub WEBP. Zdjęcie zostanie zmniejszone do 1600 px i pozbawione metadanych EXIF.
          </p>
        </div>
      </div>
    </div>
  )
}
