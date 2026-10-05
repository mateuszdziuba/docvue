'use client'

import { Check, Copy, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export function ShareBeautyPlanButton({ planId }: { planId: string }) {
  const [copied, setCopied] = useState(false)

  const buildShareUrl = () => `${window.location.origin}/share/beauty-plan/${planId}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildShareUrl())
      setCopied(true)
      toast.success('Link do planu skopiowany do schowka')
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Nie udało się skopiować linku')
    }
  }

  const handleOpen = () => {
    window.open(buildShareUrl(), '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopy}
        aria-label={copied ? 'Skopiowano link do planu' : 'Skopiuj link do planu'}
        className="border-success/30 bg-success-container font-semibold text-on-success-container hover:bg-success-container/80"
      >
        {copied ? (
          <Check className="mr-1.5 h-3.5 w-3.5" />
        ) : (
          <Copy className="mr-1.5 h-3.5 w-3.5" />
        )}
        {copied ? 'Skopiowano' : 'Kopiuj link'}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleOpen}
        aria-label="Podgląd planu pielęgnacyjnego w nowej karcie"
      >
        <ExternalLink className="mr-1.5 h-4 w-4" />
        Podgląd
      </Button>
    </div>
  )
}
