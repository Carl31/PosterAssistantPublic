'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import LoadingPage from '@/components/LoadingPage'
import { motion } from 'framer-motion'

export default function GenerateLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthChecked } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isAuthChecked && !user) {
      router.replace('/')
    }
  }, [user, isAuthChecked, router])

  // Prevent flicker
  if (!isAuthChecked) return <LoadingPage />

  return isAuthChecked && user ? (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <div className="px-4 bg-white h-full min-h-screen">
        <div className="flex flex-col items-center">
          <div className="">
            {children}
          </div>
        </div>
      </div>
    </motion.div>

  ) : (
    <LoadingPage />
  )
}