'use client'

import { Download, PlusSquare, Share } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

// Zdarzenie beforeinstallprompt potrafi wystrzelić zanim React się zamontuje —
// przechwytujemy je na poziomie modułu, żeby przycisk nie był „martwy”.
let deferredPrompt: BeforeInstallPromptEvent | null = null
const promptSubscribers = new Set<(event: BeforeInstallPromptEvent | null) => void>()

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredPrompt = event as BeforeInstallPromptEvent
    for (const notify of promptSubscribers) notify(deferredPrompt)
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    for (const notify of promptSubscribers) notify(null)
  })
}

function isInstalled() {
  if (typeof window === 'undefined') return false
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  if (window.matchMedia('(display-mode: minimal-ui)').matches) return true
  return (window.navigator as Navigator & { standalone?: boolean }).standalone === true
}

export function InstallAppButton({
  className,
  onBeforeOpen,
}: {
  className?: string
  onBeforeOpen?: () => void
}) {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(deferredPrompt)
  const [installed, setInstalled] = useState(false)
  const [isIos, setIsIos] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  useEffect(() => {
    if (isInstalled()) {
      setInstalled(true)
      return
    }

    setIsIos(/iphone|ipad|ipod/i.test(window.navigator.userAgent))
    setPromptEvent(deferredPrompt)

    const notify = (event: BeforeInstallPromptEvent | null) => setPromptEvent(event)
    promptSubscribers.add(notify)
    return () => {
      promptSubscribers.delete(notify)
    }
  }, [])

  const handleClick = async () => {
    // iOS oraz przeglądarki bez beforeinstallprompt — pokazujemy instrukcje.
    // Nie zamykamy przy tym drawera (komponent żyje w jego wnętrzu).
    if (isIos || !promptEvent) {
      setSheetOpen(true)
      return
    }

    onBeforeOpen?.()
    try {
      await promptEvent.prompt()
      await promptEvent.userChoice
    } catch {
      setSheetOpen(true)
    }
    setPromptEvent(null)
  }

  if (installed) return null

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        onClick={handleClick}
        className={cn(
          'min-h-11 w-full justify-start gap-2.5 rounded-md px-3 text-sm font-normal text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
          className,
        )}
      >
        <Download className="h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
        Zainstaluj aplikację
      </Button>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-72 p-6 pt-14">
          <SheetHeader className="space-y-1.5 text-left">
            <SheetTitle className="font-serif text-lg font-normal">Zainstaluj docvue</SheetTitle>
            <SheetDescription className="text-sm leading-relaxed">
              Dodaj docvue do ekranu głównego, aby korzystać z aplikacji jak z natywnej.
            </SheetDescription>
          </SheetHeader>
          {isIos ? (
            <ol className="mt-6 space-y-4 text-sm leading-relaxed text-on-surface-variant">
              <li className="flex items-start gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-container text-xs font-medium text-on-primary-container">
                  1
                </span>
                <span>
                  Otwórz docvue w <strong>Safari</strong> — na iPhone tylko Safari instaluje
                  aplikacje.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-container text-xs font-medium text-on-primary-container">
                  2
                </span>
                <span className="flex-1">
                  Dotknij ikony Udostępnij{' '}
                  <Share className="inline h-4 w-4 -translate-y-px" aria-hidden="true" /> (kwadrat
                  ze strzałką w górę — na dole ekranu lub obok paska adresu).
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-container text-xs font-medium text-on-primary-container">
                  3
                </span>
                <span className="flex-1">
                  Przewiń menu w dół i wybierz{' '}
                  <PlusSquare className="inline h-4 w-4 -translate-y-px" aria-hidden="true" />{' '}
                  <strong>Dodaj do ekranu głównego</strong>.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-container text-xs font-medium text-on-primary-container">
                  4
                </span>
                <span className="flex-1">
                  Potwierdź <strong>Dodaj</strong> — ikona docvue pojawi się na ekranie głównym.
                </span>
              </li>
            </ol>
          ) : (
            <ol className="mt-6 space-y-4 text-sm leading-relaxed text-on-surface-variant">
              <li className="flex items-start gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-container text-xs font-medium text-on-primary-container">
                  1
                </span>
                <span>
                  Otwórz docvue w przeglądarce <strong>Chrome</strong> lub <strong>Edge</strong>.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-container text-xs font-medium text-on-primary-container">
                  2
                </span>
                <span className="flex-1">
                  Otwórz menu przeglądarki (<span aria-hidden="true">⋮</span> lub{' '}
                  <span aria-hidden="true">⋯</span>).
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-container text-xs font-medium text-on-primary-container">
                  3
                </span>
                <span className="flex-1">
                  Wybierz <strong>Zainstaluj aplikację</strong> lub{' '}
                  <strong>Dodaj do ekranu głównego</strong>.
                </span>
              </li>
            </ol>
          )}
          <Button
            type="button"
            onClick={() => setSheetOpen(false)}
            className="mt-6 min-h-11 w-full"
          >
            Rozumiem
          </Button>
        </SheetContent>
      </Sheet>
    </>
  )
}
