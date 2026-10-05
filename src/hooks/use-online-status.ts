import { useEffect, useState } from 'react'

export function useOnlineStatus() {
  const [online, setOnline] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)

    setOnline(window.navigator.onLine)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)

    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  return online
}
