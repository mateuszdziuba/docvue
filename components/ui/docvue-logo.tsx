'use client'

import Image from 'next/image'

/**
 * Docvue Logo Icon Component
 * Uses the PNG logo file
 */
export function DocvueLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <Image
      src="/logo-dv.png"
      alt="Docvue"
      width={100}
      height={100}
      className={className}
      priority
    />
  )
}

/**
 * Full Docvue Logo with text
 */
export function DocvueLogoFull({ className = "h-10" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Image
        src="/logo-dv.png"
        alt="Docvue"
        width={40}
        height={40}
        className="w-10 h-10"
        priority
      />
      <span className="text-xl font-bold">
        <span className="text-gray-900 dark:text-white">doc</span>
        <span className="bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">vue</span>
      </span>
    </div>
  )
}
