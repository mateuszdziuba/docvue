'use client'

import Image from 'next/image'

/**
 * docvue Logo Icon Component
 * Uses the PNG logo file
 */
export function DocvueLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <Image
      src="/logo-dv.png"
      alt="docvue"
      width={100}
      height={100}
      className={className}
      priority
      unoptimized
    />
  )
}

/**
 * Full docvue Logo with text
 */
export function DocvueLogoFull({ className = "h-12" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Image
        src="/logo-dv.png"
        alt="docvue"
        width={48}
        height={48}
        className="w-12 h-12"
        priority
        unoptimized
      />
      <span className="text-2xl font-bold">
        <span className="text-gray-900 dark:text-white">doc</span>
        <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">vue</span>
      </span>
    </div>
  )
}
