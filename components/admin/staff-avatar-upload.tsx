'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { updateStaff } from '@/src/server/staff'

interface StaffAvatarUploadProps {
  staffId: string
  salonId: string
  currentAvatarPath: string | null
  name: string
  onUploaded?: (path: string) => void
}

export function StaffAvatarUpload({ staffId, salonId, currentAvatarPath, name, onUploaded }: StaffAvatarUploadProps) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Wybierz plik obrazu')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Plik jest za duży (max 5MB)')
      return
    }

    setUploading(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${salonId}/${staffId}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('staff-avatars')
        .upload(path, file, { upsert: true, contentType: file.type })

      if (uploadError) throw new Error(uploadError.message)

      // Get signed URL for private bucket
      const signedUrlRes = await supabase.storage
        .from('staff-avatars')
        .createSignedUrl(path, 60 * 60 * 24 * 365) // 1 year

      const result = await updateStaff({ id: staffId, avatar_path: path })
      if (result.error) throw new Error(result.error)

      toast.success('Zdjęcie zaktualizowane')
      onUploaded?.(signedUrlRes.data?.signedUrl ?? path)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Błąd przesyłania')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        {currentAvatarPath ? (
          <img
            src={currentAvatarPath}
            alt={name}
            className="w-14 h-14 rounded-full object-cover border border-border"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-lg font-medium border border-border">
            {initials}
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
            <svg className="animate-spin w-5 h-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}
      </div>

      <div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="text-[13px] text-primary hover:text-primary/80 font-medium transition-colors disabled:opacity-50"
        >
          {uploading ? 'Przesyłanie...' : 'Zmień zdjęcie'}
        </button>
        <p className="text-[11px] text-on-surface-variant mt-0.5">JPG, PNG, WebP • max 5MB</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
      </div>
    </div>
  )
}
