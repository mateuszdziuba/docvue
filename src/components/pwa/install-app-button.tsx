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
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [isIos, setIsIos] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (isInstalled()) {
      setInstalled(true)
      return
    }

    setIsIos(/iphone|ipad|ipod/i.test(window.navigator.userAgent))

    const onPrompt = (event: Event) => {
      event.preventDefault()
      setPromptEvent(event as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setPromptEvent(null)
    }

    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const handleClick = async () => {
    onBeforeOpen?.()
    if (isIos) {
      setSheetOpen(true)
      return
    }
    if (!promptEvent) return
    await promptEvent.prompt()
    await promptEvent.userChoice
    setPromptEvent(null)
  }

  if (installed) return null
  if (!promptEvent && !isIos) return null

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

      {isIos && (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="right" className="w-72 p-6 pt-14">
            <SheetHeader className="space-y-1.5 text-left">
              <SheetTitle className="font-serif text-lg font-normal">Zainstaluj docvue</SheetTitle>
              <SheetDescription className="text-sm leading-relaxed">
                Dodaj docvue do ekranu głównego, aby korzystać z aplikacji jak z natywnej.
              </SheetDescription>
            </SheetHeader>
            <ol className="mt-6 space-y-4 text-sm leading-relaxed text-on-surface-variant">
              <li className="flex items-start gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-container text-xs font-medium text-on-primary-container">
                  1
                </span>
                <span>
                  Otwórz tę stronę w przeglądarce <strong>Safari</strong>.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-container text-xs font-medium text-on-primary-container">
                  2
                </span>
                <span className="flex-1">
                  Dotknij przycisku Udostępnij{' '}
                  <Share className="inline h-4 w-4 -translate-y-px" aria-hidden="true" /> na dole
                  ekranu.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-container text-xs font-medium text-on-primary-container">
                  3
                </span>
                <span className="flex-1">
                  Wybierz{' '}
                  <PlusSquare className="inline h-4 w-4 -translate-y-px" aria-hidden="true" />{' '}
                  <strong>Dodaj do ekranu głównego</strong>.
                </span>
              </li>
            </ol>
            <Button
              type="button"
              onClick={() => setSheetOpen(false)}
              className="mt-6 min-h-11 w-full"
            >
              Rozumiem
            </Button>
          </SheetContent>
        </Sheet>
      )}
    </>
  )
}
