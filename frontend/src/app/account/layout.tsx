'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import LoadingPage from '@/components/LoadingPage'

export default function GenerateLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthChecked } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isAuthChecked && !user) {
      router.replace('/login')
    }
  }, [user, isAuthChecked, router])

  // Prevent flicker
  if (!isAuthChecked) return <LoadingPage/>

  return isAuthChecked && user ? (
    <div className="">
      {children}
    </div>
  ) : (
    <LoadingPage/>
  )
}