'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

interface PhotoUploadProps {
  visitId: string
  type: 'before' | 'after'
  initialPath: string | null
  onUploadComplete?: (path: string) => void
}

export function PhotoUpload({ visitId, type, initialPath, onUploadComplete }: PhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [preview, setPreview] = useState<string | null>(
    initialPath 
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/visit-photos/${initialPath}`
      : null
  )
  const [currentPath, setCurrentPath] = useState<string | null>(initialPath)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const router = useRouter()

  const handleFile = async (file: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
        toast.error('Proszę dodać plik graficzny')
        return
    }

    try {
      setIsUploading(true)
      
      // Generate unique path
      const fileExt = file.name.split('.').pop()
      const filePath = `${visitId}/${type}_${Date.now()}.${fileExt}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('visit-photos')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Update Appointment Record
      const updateData = type === 'before' 
        ? { before_photo_path: filePath } 
        : { after_photo_path: filePath }

      const { error: dbError } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', visitId)

      if (dbError) throw dbError

      setCurrentPath(filePath)
      
      // Update Preview
      const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/visit-photos/${filePath}`
      setPreview(publicUrl)
      
      toast.success('Zdjęcie zostało dodane')
      router.refresh()
      if (onUploadComplete) onUploadComplete(filePath)

    } catch (error) {
      console.error(error)
      toast.error('Błąd podczas przesyłania zdjęcia')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Czy na pewno chcesz usunąć to zdjęcie?')) return

    try {
        setIsUploading(true)
        
        // 1. Remove from Storage
        if (currentPath) {
            const { error: storageError } = await supabase.storage
                .from('visit-photos')
                .remove([currentPath])
            
            if (storageError) console.error('Storage remove error:', storageError)
        }

        // 2. Update DB
        const updateData = type === 'before' 
            ? { before_photo_path: null } 
            : { after_photo_path: null }

        const { error: dbError } = await supabase
            .from('appointments')
            .update(updateData)
            .eq('id', visitId)

        if (dbError) throw dbError

        setPreview(null)
        setCurrentPath(null)
        toast.success('Zdjęcie usunięte')

    } catch (error) {
        console.error(error)
        toast.error('Nie udało się usunąć zdjęcia')
    } finally {
        setIsUploading(false)
    }
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-900 dark:text-white capitalize flex items-center justify-between">
        <span>Zdjęcie {type === 'before' ? 'Przed' : 'Po'}</span>
        {preview && (
            <button 
                onClick={handleDelete}
                className="text-xs text-red-500 hover:text-red-600 font-medium"
                disabled={isUploading}
            >
                {isUploading ? 'Usuwanie...' : 'Usuń zdjęcie'}
            </button>
        )}
      </h3>
      
      {preview ? (
        <div className="relative aspect-square w-full sm:w-64 bg-black/5 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden group">
            <Image 
              src={preview} 
              alt={`Zdjęcie ${type}`}
              fill
              className="object-cover"
            />
            
            {/* Hover Actions */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <a 
                    href={preview} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 bg-white/90 rounded-full text-gray-700 hover:bg-white hover:text-purple-600 transition-colors"
                    title="Otwórz oryginał"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                </a>
                <button 
                    onClick={handleDelete}
                    className="p-2 bg-white/90 rounded-full text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
                    title="Usuń zdjęcie"
                >
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>
        </div>
      ) : (
        <div 
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
                relative flex flex-col items-center justify-center w-full aspect-square sm:aspect-video rounded-xl border-2 border-dashed transition-all cursor-pointer
                ${isDragging 
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                    : 'border-gray-300 dark:border-gray-700 hover:border-purple-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }
            `}
        >
            <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFile(file)
                }}
                disabled={isUploading}
            />
            
            <div className="flex flex-col items-center justify-center p-4 text-center space-y-3">
                <div className={`
                    p-3 rounded-full bg-gray-100 dark:bg-gray-800 
                    ${isDragging ? 'text-purple-600' : 'text-gray-400'}
                `}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                </div>
                <div>
                   <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      {isUploading ? 'Przesyłanie...' : 'Kliknij lub upuść zdjęcie'}
                   </p>
                   <p className="text-xs text-gray-500 mt-1">
                      PNG, JPG, WEBP (max 5MB)
                   </p>
                </div>
            </div>
        </div>
      )}
    </div>
  )
}
