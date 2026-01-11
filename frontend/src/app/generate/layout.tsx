'use client'

import { PosterWizardProvider } from '@/context/PosterWizardContext'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import LoadingPage from '@/components/LoadingPage'
import { motion } from 'framer-motion'

export default function GenerateLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthChecked } = useAuth()
  const router = useRouter()

  useEffect(() => {

    if (!user && isAuthChecked) {
      alert('You must be logged in to generate a poster.');
      router.replace('/')
    }

  }, [user, isAuthChecked, router])

  if (!isAuthChecked) return <LoadingPage />

  return (
    <PosterWizardProvider>
      {(isAuthChecked && user) ? (<div className="">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          <div className="px-4 bg-white h-full min-h-screen">
            <div className=" items-center">
              <div className="">
                {children}
              </div>
            </div>
          </div>
        </motion.div>
      </div>) : <LoadingPage />}

    </PosterWizardProvider>
  )
}