'use client'

import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/firebase/client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const router = useRouter()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            await signInWithEmailAndPassword(auth, email, password)
            router.push('/account/dashboard')
        } catch (err) {
            alert('Login failed.' + err)
        }
    }

    const handleGoogleLogin = async () => {
        const provider = new GoogleAuthProvider()
        try {
            await signInWithPopup(auth, provider)
            router.push('/account/dashboard')
        } catch (err) {
            alert('Google sign-in failed.' + err)
        }
    }

    return (
        <div>
            {/* Email/password inputs */}
            <form onSubmit={handleLogin} className="p-8 max-w-sm mx-auto">
                <h1 className="text-2xl font-bold mb-4">Login</h1>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email"
                    className="w-full border p-2 mb-2" />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password"
                    className="w-full border p-2 mb-4" />
                <button type="submit" className="bg-blue-600 text-white px-4 py-2">Login</button>
            </form>

            {/* Google login outside the form */}
            <button
                type="button"
                onClick={handleGoogleLogin}
                className="mt-2 w-full border text-sm p-2 rounded-md"
            >
                Continue with Google
            </button>
        </div>

    )
}

