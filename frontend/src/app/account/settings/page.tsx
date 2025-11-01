// src/app/account/settings/page.tsx

'use client'

import { getAuth, signOut, updateProfile } from 'firebase/auth'
import { doc, getDoc, getFirestore, updateDoc } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'

export default function AccountSettingsPage() {
    const [email, setEmail] = useState<string | null>(null)
    const [uid, setUid] = useState<string | null>(null)
    const [name, setName] = useState<string>('')
    const [instagramHandle, setInstagramHandle] = useState<string>('')
    const [originalName, setOriginalName] = useState<string>('')
    const [originalInstagram, setOriginalInstagram] = useState<string>('')

    const [showSavePopup, setShowSavePopup] = useState(false)
    const [showLogoutPopup, setShowLogoutPopup] = useState(false)
    const [pendingAction, setPendingAction] = useState<'back' | 'logout' | null>(null)

    const router = useRouter()
    const auth = getAuth()
    const db = getFirestore()

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) return

            setEmail(user.email)
            setUid(user.uid)

            // Load user info from Firestore
            const userDoc = doc(db, 'users', user.uid)
            const userSnap = await getDoc(userDoc)
            if (userSnap.exists()) {
                const data = userSnap.data()
                setName(data.displayName || '')
                setOriginalName(data.displayName || '')
                setInstagramHandle(data.instagramHandle || '')
                setOriginalInstagram(data.instagramHandle || '')
            }
        })

        return () => unsubscribe()
    }, [])

    const hasChanges = () => name !== originalName || instagramHandle !== originalInstagram

    const handleSaveChanges = async () => {
        if (!auth.currentUser) return
        const userDoc = doc(db, 'users', auth.currentUser.uid)

        // Update Firestore
        await updateDoc(userDoc, {
            displayName: name,
            instagramHandle: instagramHandle,
        })

        // Optionally update Firebase Auth display name
        if (auth.currentUser.displayName !== name) {
            await updateProfile(auth.currentUser, { displayName: name })
        }

        setOriginalName(name)
        setOriginalInstagram(instagramHandle)
    }

    const handleBack = async () => {
        if (hasChanges()) {
            setPendingAction('back')
            setShowSavePopup(true)
        } else {
            router.replace('/account/dashboard')
        }
    }

    const handleLogout = async () => {
        if (hasChanges()) {
            // Unsaved changes exist → show save popup first
            setPendingAction('logout')
            setShowSavePopup(true)
        } else {
            // No changes → show logout confirmation popup
            setShowLogoutPopup(true)
        }
    }

    const handleConfirmSave = async () => {
        await handleSaveChanges()
        setShowSavePopup(false)
        if (pendingAction === 'logout') {
            // After saving changes, show logout confirmation popup
            setShowLogoutPopup(true)
        } else if (pendingAction === 'back') {
            router.replace('/account/dashboard')
        }
        setPendingAction(null)
    }

    const handleCancelSave = () => {
        setShowSavePopup(false)
        setPendingAction(null)
    }

    const handleConfirmLogout = async () => {
        await signOut(auth)
        router.push('/login')
    }

    const handleCancelLogout = () => {
        setShowLogoutPopup(false)
    }

    return (
        <div className="p-4 max-w-lg mx-auto">
            <h1 className="text-2xl font-bold mb-4 ml-1">Account Settings</h1>

            <div className="bg-gray-900 rounded-xl shadow-md p-4 space-y-3">
                <div>
                    <p className="text-sm text-gray-500">Name</p>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full mt-1 p-2 rounded-md bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div>
                    <p className="text-sm text-gray-500">Instagram Handle</p>
                    <input
                        type="text"
                        value={instagramHandle}
                        onChange={(e) => setInstagramHandle(e.target.value)}
                        placeholder="@yourhandle"
                        className="w-full mt-1 p-2 rounded-md bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

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

                <div>
                    <p className="text-sm text-gray-500">Need help?</p>
                    <p className="text-sm text-gray-500">Message the app discord server :)</p>
                </div>
            </div>

            <div className="flex justify-between">
                <button
                    onClick={handleBack}
                    className="self-end relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-purple-600 to-blue-500 group-hover:from-purple-600 group-hover:to-blue-500 hover:text-white dark:text-white focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800"
                >
                    <span className="relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-transparent group-hover:dark:bg-transparent">
                        Back
                    </span>
                </button>

                <button
                    onClick={handleLogout}
                    className="self-start mt-6 relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-pink-500 to-orange-400 group-hover:from-pink-500 group-hover:to-orange-400 hover:text-white dark:text-white focus:ring-4 focus:outline-none focus:ring-pink-200 dark:focus:ring-pink-800"
                >
                    <span className="relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-transparent group-hover:dark:bg-transparent">
                        Sign Out
                    </span>
                </button>
            </div>

            {/* Unsaved changes popup */}
            {showSavePopup && (
                <div className="p-2 fixed inset-0 flex items-center justify-center backdrop-blur-sm z-50 fade-in">
                    <div className="m-2 popup-content p-4 rounded-lg max-w-sm min-h-37 text-center bg-gray-100 relative">
                        <p className="mt-6 mb-4 text-gray-800 text-sm sm:text-base">
                            You have unsaved changes. Do you want to save them?
                        </p>
                        <div className="flex space-x-2 justify-center">
                            <button
                                onClick={handleConfirmSave}
                                className="px-3 py-2 rounded bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 transition-colors text-sm"
                            >
                                Save
                            </button>
                            <button
                                onClick={handleCancelSave}
                                className="px-3 py-2 rounded bg-gray-300 text-gray-700 hover:bg-gray-400 transition-colors text-sm"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Logout confirmation popup */}
            {showLogoutPopup && (
                <div className="p-2 fixed inset-0 flex items-center justify-center backdrop-blur-sm z-50 fade-in">
                    <div className="m-2 popup-content p-4 rounded-lg max-w-sm min-h-37 text-center bg-gray-100 relative">
                        <p className="mt-6 mb-4 text-gray-800 text-sm sm:text-base">
                            Are you sure you want to sign out?
                        </p>
                        <div className="flex space-x-2 justify-center">
                            <button
                                onClick={handleConfirmLogout}
                                className="px-3 py-2 rounded bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 transition-colors text-sm"
                            >
                                Sign Out
                            </button>
                            <button
                                onClick={handleCancelLogout}
                                className="px-3 py-2 rounded bg-gray-300 text-gray-700 hover:bg-gray-400 transition-colors text-sm"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
