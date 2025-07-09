'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'


export default function DashboardPage() {
  const { user } = useAuth()
  const router = useRouter()

  if (!user) return <div className="p-8">Loading...</div>

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Welcome, {user.displayName || user.email}</h1>

      <button
        onClick={() => {
          router.replace('/generate/select');
        }}
        className="mt-6 bg-blue-600 text-white px-4 py-2 rounded-md"
      >
        Make a poster
      </button>

      <button
        onClick={() => {
          router.replace('/account/settings');
        }}
        className="mt-6 bg-blue-600 text-white px-4 py-2 rounded-md"
      >
        Account Settings
      </button>

      <button
        onClick={() => {
          router.replace('/account/posters');
        }}
        className="mt-6 bg-blue-600 text-white px-4 py-2 rounded-md"
      >
        My Posters
      </button>

    </div>
  )
}