'use client'

/**
 * docvue Logo — Text-based brand mark
 * Uses brand teal for "vue" instead of generic gradients
 */
export function DocvueLogo({
  className = 'text-xl',
  onPanel = false,
}: {
  className?: string
  onPanel?: boolean
}) {
  // Pełny znak na stronie: „docvue” (doc ciemne na jasnym, białe na ciemnym).
  // Skrót „dv” jest tylko ikoną PWA (public/icons).
  return (
    <span className={`font-bold tracking-tight ${className}`}>
      <span className={onPanel ? 'text-panel-on-surface' : 'text-foreground'}>doc</span>
      <span className={onPanel ? 'text-panel-emphasis' : 'text-primary'}>vue</span>
    </span>
  )
}

/**
 * Full docvue Logo (same as DocvueLogo, kept for compatibility)
 */
export function DocvueLogoFull({ className = 'text-xl' }: { className?: string }) {
  return <DocvueLogo className={className} />
}
