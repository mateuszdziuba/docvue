'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Check, Copy, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

export function ShareBeautyPlanButton({ planId }: { planId: string }) {
  const [copied, setCopied] = useState(false)

  const shareUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/share/beauty-plan/${planId}`
    : ''

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast.success('Link skopiowany do schowka!')
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast.error('Nie udało się skopiować linku')
    }
  }

  const handleOpen = () => {
    window.open(shareUrl, '_blank')
  }

  return (
    <div className="flex items-center gap-2">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleCopy}
        className="h-8 border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 transition-colors px-3 font-semibold"
      >
        {copied ? <Check className="w-3.5 h-3.5 mr-1.5" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
        Kopiuj link
      </Button>
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={handleOpen}
        title="Otwórz podgląd w nowej karcie"
        className="h-8 w-8 text-muted-foreground hover:text-emerald-500"
      >
        <ExternalLink className="w-4 h-4" />
      </Button>
    </div>
  )
}
