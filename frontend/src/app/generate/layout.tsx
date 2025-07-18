'use client'

import { PosterWizardProvider } from '@/context/PosterWizardContext'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import LoadingPage from '@/components/LoadingPage'

export default function GenerateLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthChecked } = useAuth()
  const router = useRouter()

  useEffect(() => {

    if (!user && isAuthChecked) {
      alert('You must be logged in to generate a poster.');
      router.replace('/login')
    }

  }, [user, isAuthChecked, router])

  if (!isAuthChecked) return <LoadingPage />

  return (
    <PosterWizardProvider>
      {(isAuthChecked && user) ? (<div className="">
        {children}
      </div>) : <LoadingPage/>}
      
    </PosterWizardProvider>
  )
}