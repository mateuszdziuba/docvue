'use client'

import Image from 'next/image'

/**
 * docvue Logo Icon Component
 * Uses the PNG logo file
 */
export function DocvueLogo({ className = "h-10 w-auto" }: { className?: string }) {
  return (
    <Image
      src="/logo-dv.png"
      alt="docvue"
      width={100}
      height={60}
      className={`${className} object-contain`}
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
    <div className={`flex items-center gap-1.5 ${className}`}>
      <Image
        src="/logo-dv.png"
        alt="docvue"
        width={60}
        height={36}
        className="h-10 w-auto object-contain"
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
