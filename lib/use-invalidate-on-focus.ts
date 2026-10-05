'use client'

import { useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'

/**
 * Odświeża loadery trasy, gdy użytkownik wraca na kartę (np. po wypełnieniu
 * formularza w nowej karcie albo usunięciu czegoś w innym widoku).
 */
export function useInvalidateOnFocus() {
  const router = useRouter()

  useEffect(() => {
    const handleFocus = () => {
      if (document.visibilityState === 'visible') void router.invalidate()
    }
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void router.invalidate()
    }
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [router])
}
