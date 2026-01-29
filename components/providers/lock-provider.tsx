'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { LockScreen } from '@/components/admin/lock-screen'

interface LockContextType {
  isLocked: boolean
  lock: () => void
  unlock: () => void
}

const LockContext = createContext<LockContextType | undefined>(undefined)

export function LockProvider({ children }: { children: React.ReactNode }) {
  const [isLocked, setIsLocked] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Check local storage on mount
    const locked = localStorage.getItem('dashboard_locked') === 'true'
    setIsLocked(locked)
    setMounted(true)
  }, [])

  const lock = () => {
    setIsLocked(true)
    localStorage.setItem('dashboard_locked', 'true')
  }

  const unlock = () => {
    setIsLocked(false)
    localStorage.removeItem('dashboard_locked')
  }

  if (!mounted) return null

  return (
    <LockContext.Provider value={{ isLocked, lock, unlock }}>
      {isLocked && <LockScreen onUnlock={unlock} />}
      <div className={isLocked ? 'hidden' : ''}>
        {children}
      </div>
    </LockContext.Provider>
  )
}

export function useLock() {
  const context = useContext(LockContext)
  if (context === undefined) {
    throw new Error('useLock must be used within a LockProvider')
  }
  return context
}
