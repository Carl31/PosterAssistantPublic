
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/firebase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import LoadingPage from '@/components/LoadingPage'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // initial page load complete
    setLoading(false)
  }, [])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await createUserWithEmailAndPassword(auth, email, password)
      router.push('/account/dashboard?signup=true')
    } catch (err: any) {
      alert(err.message || 'Signup failed.')
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingPage text="Loading..." />
      </div>
    )
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4 ml-1">SickShotsAI</h1>

      <div className="bg-gray-900 rounded-xl shadow-md p-4 space-y-3">
        <form onSubmit={handleSignup} className="p-8 max-w-sm mx-auto">
          <h1 className="text-2xl font-bold mb-4">Sign Up</h1>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full border p-2 mb-2"
            disabled={loading}
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full border p-2 mb-4"
            disabled={loading}
          />

          <button
            type="submit"
            disabled={loading}
            className="px-3 py-2 rounded bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 transition-colors text-sm disabled:opacity-50"
          >
            {loading ? 'Signing up…' : 'Sign Up'}
          </button>
        </form>
      </div>
    </div>
  )
}

