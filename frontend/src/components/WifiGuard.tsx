'use client'

import { useEffect, useState } from 'react'
import Spinner from '@/components/Spinner'

export default function WifiGuard({ children }: { children: React.ReactNode }) {
  // Default true to avoid a flash on first render (navigator is not available server-side)
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    // Sync with real value once mounted on the client
    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <>
      {!isOnline && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center backdrop-blur-sm bg-white/20">
          <Spinner />
          <p className="mt-4 text-sm font-semibold text-gray-800 tracking-wide">
            Reconnecting...
          </p>
        </div>
      )}
      <div className={!isOnline ? 'blur-sm pointer-events-none select-none' : ''}>
        {children}
      </div>
    </>
  )
}