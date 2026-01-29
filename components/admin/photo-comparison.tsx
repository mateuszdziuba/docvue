'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog"

interface PhotoComparisonProps {
  beforePath: string
  afterPath: string
}

export function PhotoComparison({ beforePath, afterPath }: PhotoComparisonProps) {
  const beforeUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/visit-photos/${beforePath}`
  const afterUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/visit-photos/${afterPath}`

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-purple-500/20">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          Porównaj efekty (Side by Side)
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl w-full p-1 bg-white dark:bg-gray-900 border-none">
        <DialogTitle className="sr-only">Porównanie efektów</DialogTitle>
        <div className="grid grid-cols-2 gap-1 h-[60vh] md:h-[80vh]">
          {/* Before */}
          <div className="relative w-full h-full bg-black/5 dark:bg-white/5 rounded-l-lg overflow-hidden group">
            <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-black/50 backdrop-blur-md rounded-full text-white text-sm font-medium">
              PRZED
            </div>
            <Image
              src={beforeUrl}
              alt="Zdjęcie przed"
              fill
              className="object-contain"
            />
          </div>

          {/* After */}
          <div className="relative w-full h-full bg-black/5 dark:bg-white/5 rounded-r-lg overflow-hidden group">
             <div className="absolute top-4 right-4 z-10 px-3 py-1 bg-purple-600/80 backdrop-blur-md rounded-full text-white text-sm font-medium">
              PO
            </div>
            <Image
              src={afterUrl}
              alt="Zdjęcie po"
              fill
              className="object-contain"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
