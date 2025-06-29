'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Spinner from '@/components/Spinner'

export default function GenerateLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthChecked } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isAuthChecked && !user) {
      alert('You must be logged in to see this page.');
      router.replace('/login')
    }
  }, [user, isAuthChecked, router])

  // Prevent flicker
  if (!isAuthChecked) return <Spinner />

  return isAuthChecked && user ? (
    <div className="">
      {children}
    </div>
  ) : (
    <Spinner />
  )
}