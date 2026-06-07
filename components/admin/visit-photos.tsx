'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'

interface VisitPhotosProps {
  appointment: any
}

export function VisitPhotos({ appointment }: VisitPhotosProps) {
  const beforeRef = useRef<HTMLInputElement>(null)
  const afterRef = useRef<HTMLInputElement>(null)

  return (
    <div className="bg-card rounded-lg border border-border p-5 space-y-4">
      <h2 className="font-medium text-foreground">Zdjęcia przed / po</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="label-caps text-muted-foreground mb-2">Przed</p>
          {appointment.before_photo_path ? (
            <img
              src={`/api/photos/${appointment.before_photo_path}`}
              alt="Przed"
              className="w-full aspect-square object-cover rounded-lg border border-border"
            />
          ) : (
            <button
              onClick={() => beforeRef.current?.click()}
              className="w-full aspect-square flex items-center justify-center border-2 border-dashed border-border rounded-lg text-muted-foreground hover:border-primary hover:text-primary transition-colors text-sm"
            >
              + Dodaj zdjęcie
            </button>
          )}
          <input ref={beforeRef} type="file" accept="image/*" className="hidden" />
        </div>
        <div>
          <p className="label-caps text-muted-foreground mb-2">Po</p>
          {appointment.after_photo_path ? (
            <img
              src={`/api/photos/${appointment.after_photo_path}`}
              alt="Po"
              className="w-full aspect-square object-cover rounded-lg border border-border"
            />
          ) : (
            <button
              onClick={() => afterRef.current?.click()}
              className="w-full aspect-square flex items-center justify-center border-2 border-dashed border-border rounded-lg text-muted-foreground hover:border-primary hover:text-primary transition-colors text-sm"
            >
              + Dodaj zdjęcie
            </button>
          )}
          <input ref={afterRef} type="file" accept="image/*" className="hidden" />
        </div>
      </div>
    </div>
  )
}
