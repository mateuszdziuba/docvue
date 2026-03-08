'use client'

import { useEffect, useRef } from 'react'
import { CalendarPlus, Clock, Lock } from 'lucide-react'

interface SlotContextMenuProps {
  x: number
  y: number
  isBlockMode?: boolean
  onCreateAppointment: () => void
  onReserveTime: () => void
  onBlockInstant: () => void
  onClose: () => void
}

export function SlotContextMenu({
  x,
  y,
  isBlockMode,
  onCreateAppointment,
  onReserveTime,
  onBlockInstant,
  onClose,
}: SlotContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    // Slight delay so the click that opened the menu doesn't immediately close it
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick)
      document.addEventListener('keydown', handleKey)
    }, 50)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  const menuW = 210
  const menuH = 140
  const left = Math.min(x, window.innerWidth - menuW - 8)
  const top = Math.min(y, window.innerHeight - menuH - 8)

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-[210px] rounded-xl border border-border bg-popover shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100"
      style={{ left, top }}
    >
      <button
        className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
        onClick={() => { onCreateAppointment(); onClose() }}
      >
        <CalendarPlus className="w-4 h-4 text-primary shrink-0" />
        Utwórz wizytę
      </button>

      <div className="h-px bg-border mx-3" />

      <button
        className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
        onClick={() => { onReserveTime(); onClose() }}
      >
        <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
        Zarezerwuj czas
      </button>

      <div className="h-px bg-border mx-3" />

      <button
        className={`flex w-full items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
          isBlockMode
            ? 'text-destructive bg-destructive/5 hover:bg-destructive/10'
            : 'text-foreground hover:bg-secondary'
        }`}
        onClick={onBlockInstant}
      >
        <Lock className="w-4 h-4 shrink-0 text-destructive" />
        Zablokuj od razu
      </button>
    </div>
  )
}
