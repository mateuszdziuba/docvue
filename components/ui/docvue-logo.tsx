'use client'

/**
 * docvue Logo — Text-based brand mark
 * Uses brand teal for "vue" instead of generic gradients
 */
export function DocvueLogo({ className = "text-xl" }: { className?: string }) {
  return (
    <span className={`font-bold tracking-tight ${className}`}>
      <span className="text-foreground">doc</span>
      <span className="text-primary">vue</span>
    </span>
  )
}

/**
 * Full docvue Logo (same as DocvueLogo, kept for compatibility)
 */
export function DocvueLogoFull({ className = "text-xl" }: { className?: string }) {
  return <DocvueLogo className={className} />
}
