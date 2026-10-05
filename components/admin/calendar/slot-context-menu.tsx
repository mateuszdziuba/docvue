'use client'

import { CalendarPlus, Clock, Lock } from 'lucide-react'
import { useEffect, useRef } from 'react'

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
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null
    itemRefs.current[0]?.focus()
  }, [])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick)
    }, 50)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [onClose])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const items = itemRefs.current.filter((item): item is HTMLButtonElement => Boolean(item))
    if (items.length === 0) return
    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement)

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      items[(currentIndex + 1) % items.length]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      items[(currentIndex - 1 + items.length) % items.length]?.focus()
    } else if (e.key === 'Home') {
      e.preventDefault()
      items[0]?.focus()
    } else if (e.key === 'End') {
      e.preventDefault()
      items[items.length - 1]?.focus()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
      previouslyFocusedRef.current?.focus?.()
    }
  }

  const menuW = 210
  const menuH = 140
  const left = Math.min(x, window.innerWidth - menuW - 8)
  const top = Math.min(y, window.innerHeight - menuH - 8)

  const itemClass =
    'flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring transition-colors min-h-[44px]'

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Akcje dla wybranego terminu"
      onKeyDown={handleKeyDown}
      className="fixed z-50 min-w-[210px] rounded-xl border border-border bg-popover shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100"
      style={{ left, top }}
    >
      <button
        ref={(el) => {
          itemRefs.current[0] = el
        }}
        type="button"
        role="menuitem"
        className={itemClass}
        onClick={() => {
          onCreateAppointment()
          onClose()
        }}
      >
        <CalendarPlus className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
        Utwórz wizytę
      </button>

      <div className="h-px bg-border mx-3" />

      <button
        ref={(el) => {
          itemRefs.current[1] = el
        }}
        type="button"
        role="menuitem"
        className={itemClass}
        onClick={() => {
          onReserveTime()
          onClose()
        }}
      >
        <Clock className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
        Zarezerwuj czas
      </button>

      <div className="h-px bg-border mx-3" />

      <button
        ref={(el) => {
          itemRefs.current[2] = el
        }}
        type="button"
        role="menuitem"
        className={`${itemClass} ${
          isBlockMode
            ? 'text-destructive bg-destructive/5 hover:bg-destructive/10'
            : 'text-foreground hover:bg-secondary'
        }`}
        onClick={onBlockInstant}
      >
        <Lock className="w-4 h-4 shrink-0 text-destructive" aria-hidden="true" />
        Zablokuj od razu
      </button>
    </div>
  )
}
