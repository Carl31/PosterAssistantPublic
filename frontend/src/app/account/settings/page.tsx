// src/app/account/settings/page.tsx

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAuth, onAuthStateChanged, signOut, updateProfile } from 'firebase/auth'
import { doc, getDoc, getFirestore, updateDoc } from 'firebase/firestore'

export default function AccountSettingsPage() {
    /* ---------------------------------------------------------------------
       State: user identity
    --------------------------------------------------------------------- */
    const [email, setEmail] = useState<string | null>(null)
    const [uid, setUid] = useState<string | null>(null)

    /* ---------------------------------------------------------------------
       State: editable profile fields
    --------------------------------------------------------------------- */
    const [name, setName] = useState('')
    const [instagramHandle, setInstagramHandle] = useState('')

    /* ---------------------------------------------------------------------
       State: original values (used to detect unsaved changes)
    --------------------------------------------------------------------- */
    const [originalName, setOriginalName] = useState('')
    const [originalInstagram, setOriginalInstagram] = useState('')

    /* ---------------------------------------------------------------------
       UI state
    --------------------------------------------------------------------- */
    const [showLogoutPopup, setShowLogoutPopup] = useState(false)
    const [showOverlay, setShowOverlay] = useState(false)

    const router = useRouter()
    const auth = getAuth()
    const db = getFirestore()

    /* ---------------------------------------------------------------------
       Load user data on auth change
    --------------------------------------------------------------------- */
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) return

            setEmail(user.email)
            setUid(user.uid)

            const userRef = doc(db, 'users', user.uid)
            const snap = await getDoc(userRef)

            if (snap.exists()) {
                const data = snap.data()
                setName(data.displayName || '')
                setInstagramHandle(data.instagramHandle || '')
                setOriginalName(data.displayName || '')
                setOriginalInstagram(data.instagramHandle || '')
            }
        })

        return () => unsubscribe()
    }, [])

    /* ---------------------------------------------------------------------
       Derived state helpers
    --------------------------------------------------------------------- */
    const hasChanges =
        name != originalName || instagramHandle != originalInstagram

    const isProfileComplete =
        name.trim() !== '' && instagramHandle.trim() !== ''

    const isProfileSaved =
        originalName.trim() !== '' && originalInstagram.trim() !== ''

    // Save button enabled only when changes exist AND profile is valid
    const canSave = hasChanges && isProfileComplete

    /* ---------------------------------------------------------------------
       Actions
    --------------------------------------------------------------------- */
    const handleSaveChanges = async () => {
        if (!auth.currentUser || !canSave) return

        const userRef = doc(db, 'users', auth.currentUser.uid)

        // Update Firestore
        await updateDoc(userRef, {
            displayName: name,
            instagramHandle: instagramHandle,
        })

        // Keep Firebase Auth display name in sync
        if (auth.currentUser.displayName !== name) {
            await updateProfile(auth.currentUser, { displayName: name })
        }

        // Mark current values as saved
        setOriginalName(name)
        setOriginalInstagram(instagramHandle)
    }

    const handleBack = () => {
        if (!isProfileSaved) {
            setShowOverlay(true)
            return
        }
        router.replace('/account/dashboard')
    }

    const handleLogout = () => {
        if (!isProfileSaved) {
            setShowOverlay(true)
            return
        }
        setShowLogoutPopup(true)
    }

    const handleConfirmLogout = async () => {
        await signOut(auth)
        router.push('/login')
    }

    /* ---------------------------------------------------------------------
       Render
    --------------------------------------------------------------------- */
    return (
        <div className="p-4 max-w-lg mx-auto">
            <h1 className="text-2xl font-bold mb-4 ml-1">Account Settings</h1>

            <div className="bg-gray-900 rounded-xl shadow-md p-4 space-y-3">
                {/* Username */}
                <div>
                    <p className="text-sm text-gray-500">Username</p>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full mt-1 p-2 rounded-md bg-gray-800 text-white border border-gray-700 focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Instagram */}
                <div>
                    <p className="text-sm text-gray-500">Instagram Handle</p>
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 pt-3 text-gray-300">
                            @
                        </span>
                        <input
                            type="text"
                            value={instagramHandle}
                            onChange={(e) => setInstagramHandle(e.target.value)}
                            className="w-full mt-1 p-2 pl-8 rounded-md bg-gray-800 text-white border border-gray-700 focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {/* Read-only fields */}
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
                    <p className="text-base">Early Access</p>
                </div>

                {/* Save button */}
                <button
                    onClick={handleSaveChanges}
                    disabled={!canSave}
                    className={`
                        w-full mt-4 py-2 rounded-md text-sm font-medium transition-all
                        ${canSave
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-green-900/40 text-green-300 cursor-not-allowed'}
                    `}
                >
                    Save changes
                </button>
            </div>

            {/* Navigation buttons */}
            <div className="flex justify-between mt-4">
                <button
                    onClick={handleBack}
                    className="px-5 py-2 rounded-lg bg-gradient-to-br from-purple-600 to-blue-500 text-white"
                >
                    Back
                </button>

                <button
                    onClick={handleLogout}
                    className="px-5 py-2 rounded-lg bg-gradient-to-br from-pink-500 to-orange-400 text-white"
                >
                    Sign Out
                </button>
            </div>

            {/* Logout confirmation */}
            {showLogoutPopup && (
                <div className="fixed inset-0 flex items-center justify-center backdrop-blur-sm z-50">
                    <div className="p-4 rounded-lg bg-gray-100 text-center">
                        <p className="mb-4 text-gray-800">
                            Are you sure you want to sign out?
                        </p>
                        <div className="flex gap-2 justify-center">
                            <button
                                onClick={handleConfirmLogout}
                                className="px-4 py-2 bg-red-600 text-white rounded"
                            >
                                Sign Out
                            </button>
                            <button
                                onClick={() => setShowLogoutPopup(false)}
                                className="px-4 py-2 bg-gray-300 rounded"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Profile completion overlay */}
            {showOverlay && (
                <div
                    className="fixed inset-0 z-50"
                    onClick={() => setShowOverlay(false)}
                >
                    <div className="absolute inset-0 bg-black/70" />
                    <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
                        <div className="bg-gray-900 border border-cyan-500 rounded-xl px-6 py-4 text-white text-sm">
                            Add your username and Instagram handle here.
                            <br />
                            <br />
                            Your handle will appear on your posters.
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
