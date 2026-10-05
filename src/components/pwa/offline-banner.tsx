import { WifiOff, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useOnlineStatus } from '@/src/hooks/use-online-status'

export function OfflineBanner() {
  const online = useOnlineStatus()
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (online) setDismissed(false)
  }, [online])

  if (online || dismissed) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-[calc(3.5rem+env(safe-area-inset-top))] z-30 flex items-center gap-2 border-b border-accent/40 bg-accent/15 px-3 py-2 text-sm leading-snug text-foreground backdrop-blur-sm md:left-60 md:top-0 md:px-4"
    >
      <WifiOff className="h-4 w-4 shrink-0 text-accent-foreground" aria-hidden="true" />
      <p className="min-w-0 flex-1">Brak połączenia z internetem — dane mogą być nieaktualne</p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Ukryj powiadomienie o braku połączenia"
        className="grid h-11 w-11 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent/30 hover:text-foreground"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}
