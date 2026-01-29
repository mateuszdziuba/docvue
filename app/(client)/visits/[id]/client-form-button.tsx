'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createFormAssignment } from '@/actions/client-portal'

export function ClientFormButton({ 
  clientId, 
  formId, 
  salonId,
  className = "",
  variant = 'default'
}: { 
  clientId: string, 
  formId: string, 
  salonId: string,
  className?: string,
  variant?: 'default' | 'sm'
}) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  // ... rest of hook logic stays same ...
  
  // Logic ...

  return (
    <button 
      onClick={handleClick}
      disabled={isLoading}
      className={`
        inline-flex items-center gap-2 font-bold rounded-xl shadow transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
        ${variant === 'sm' 
          ? 'px-3 py-1.5 text-xs bg-red-600 text-white hover:bg-red-700' 
          : 'px-6 py-3 bg-red-600 text-white hover:bg-red-700 hover:scale-[1.02] shadow-lg'}
        ${className}
      `}
    >
      {isLoading ? '...' : (variant === 'sm' ? 'Wypełnij' : 'Wypełnij teraz')}
      {variant !== 'sm' && (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      )}
    </button>
  )
}
