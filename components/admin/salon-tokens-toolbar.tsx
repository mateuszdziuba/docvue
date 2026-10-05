'use client'

import { Button } from '@/components/ui/button'
import { SALON_TOKENS } from '@/lib/salon-placeholders'

interface SalonTokensToolbarProps {
  inputId: string
  value: string
  onChange: (nextValue: string) => void
}

export function SalonTokensToolbar({ inputId, value, onChange }: SalonTokensToolbarProps) {
  const insertToken = (token: string) => {
    const element = document.getElementById(inputId) as
      | HTMLInputElement
      | HTMLTextAreaElement
      | null
    if (!element) {
      onChange(`${value}${token}`)
      return
    }
    const start = element.selectionStart ?? value.length
    const end = element.selectionEnd ?? value.length
    const next = `${value.slice(0, start)}${token}${value.slice(end)}`
    onChange(next)
    requestAnimationFrame(() => {
      element.focus()
      const position = start + token.length
      element.setSelectionRange(position, position)
    })
  }

  return (
    <fieldset className="flex flex-wrap items-center gap-1.5">
      <legend className="sr-only">Wstaw zmienną gabinetu</legend>
      <span className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
        Wstaw:
      </span>
      {SALON_TOKENS.map(({ token, label }) => (
        <Button
          key={token}
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => insertToken(token)}
        >
          {label}
        </Button>
      ))}
    </fieldset>
  )
}
