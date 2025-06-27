'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Spinner from '@/components/Spinner'

export default function GenerateLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthChecked } = useAuth()
  const router = useRouter()

  useEffect(() => {

    if (!user) {
      alert('You must be logged in to see this page.');
      router.replace('/login')
    }
  }, [user, router])

  // Prevent flicker
  if (!isAuthChecked) return null

  return isAuthChecked && user ? (
    <div className="">
      {children}
    </div>
  ) : (
    <Spinner />
  )
}