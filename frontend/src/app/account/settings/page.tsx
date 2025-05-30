// src/app/account/settings/page.tsx

'use client'

import { getAuth, signOut } from 'firebase/auth'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'

export default function AccountSettingsPage() {
    const [email, setEmail] = useState<string | null>(null)
    const [uid, setUid] = useState<string | null>(null)
    const router = useRouter()

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(getAuth(), async (user) => {
            if (!user) {
                return
            }

            setEmail(user.email)
            setUid(user.uid)
        })

        return () => unsubscribe()
    }, [])




    const handleLogout = async () => {
        await signOut(getAuth())
        router.push('/login') // or homepage if you prefer
    }

    return (
        <div className="p-4 max-w-lg mx-auto">
            <h1 className="text-2xl font-bold mb-4">Account Settings</h1>

            <div className="bg-white rounded-xl shadow-md p-4 space-y-3">
                <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="text-base font-medium">{email || '—'}</p>
                </div>

                <div>
                    <p className="text-sm text-gray-500">User ID</p>
                    <p className="text-base font-mono break-all">{uid || '—'}</p>
                </div>

                <div>
                    <p className="text-sm text-gray-500">Subscription</p>
                    <p className="text-base">Free (MVP)</p> {/* 🔁 Replace when Stripe is wired */}
                </div>

                <div>
                    <p className="text-sm text-gray-500">Next renewal</p>
                    <p className="text-base text-gray-700">—</p> {/* Placeholder */}
                </div>

                <button
                    onClick={handleLogout}
                    className="mt-4 bg-red-500 text-white px-4 py-2 rounded-md"
                >
                    Sign Out
                </button>
            </div>
        </div>
    )
}
