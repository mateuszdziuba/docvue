'use client'

/**
 * docvue Logo - Text Only
 */
export function DocvueLogo({ className = "text-xl" }: { className?: string }) {
  return (
    <span className={`font-bold ${className}`}>
      <span className="text-gray-900 dark:text-white">doc</span>
      <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">vue</span>
    </span>
  )
}

/**
 * Full docvue Logo (same as DocvueLogo, kept for compatibility)
 */
export function DocvueLogoFull({ className = "text-xl" }: { className?: string }) {
  return <DocvueLogo className={className} />
}
