// src/app/account/settings/page.tsx

'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getAuth, onAuthStateChanged, signOut, updateProfile } from 'firebase/auth'
import { doc, getDoc, getFirestore, updateDoc } from 'firebase/firestore'
import { Credit } from '@/types/credit'

export default function AccountSettingsPage() {
    const searchParams = useSearchParams();
    const showFinalTutorialFlag = searchParams!.get('final') === 'true';

    /* ---------------------------------------------------------------------
       State: user identity
    --------------------------------------------------------------------- */
    const [email, setEmail] = useState<string | null>(null)
    //const [uid, setUid] = useState<string | null>(null)
    const [credits, setCredits] = useState<Credit>({ carJam: 0, ai: 0, posterGen: 0 })

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
            //setUid(user.uid)

            const userRef = doc(db, 'users', user.uid)
            const snap = await getDoc(userRef)

            if (snap.exists()) {
                const data = snap.data()
                setName(data.displayName || '')
                setInstagramHandle(data.instagramHandle || '')
                setOriginalName(data.displayName || '')
                setOriginalInstagram(data.instagramHandle || '')
                setCredits(data.credits || { carJam: 0, ai: 0, posterGen: 0 })
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
        if (showFinalTutorialFlag) {
            router.replace('/account/dashboard?final=true')
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
        router.push('/')
    }

    /* ---------------------------------------------------------------------
       Render
    --------------------------------------------------------------------- */
    return (
        <div className="p-4 max-w-lg mx-auto">
            <h1 className="text-2xl font-bold mb-4 ml-1 text-black">Account Settings</h1>

            <div className="bg-blue-200 border-3 border-black rounded-xl shadow-md p-4 space-y-3">
                {/* Username */}
                <div>
                    <p className="text-sm text-black"><b>Username</b></p>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full mt-1 p-2 rounded-md bg-gray-100 text-black border-2 border-gray-700 focus:ring-2 focus:ring-black"
                    />
                </div>

                {/* Instagram */}
                <div>
                    <p className="text-sm text-black"><b>Instagram Handle</b></p>
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 pt-3 text-black">
                            @
                        </span>
                        <input
                            type="text"
                            value={instagramHandle}
                            onChange={(e) => setInstagramHandle(e.target.value)}
                            className="w-full mt-1 p-2 pl-8 rounded-md bg-gray-100 text-black border-2 border-gray-700 focus:ring-2 focus:ring-black"
                        />
                    </div>
                </div>

                {/* Read-only fields */}
                <div>
                    <p className="text-sm text-black"><b>Email</b></p>
                    <p className="text-base font-medium text-black">{email || '—'}</p>
                </div>

                {/* <div>
                    <p className="text-sm text-black"><b>User ID</b></p>
                    <p className="text-base font-mono break-all text-black">{uid || '—'}</p>
                </div> */}

                <div>
                    <p className="text-sm text-black"><b>Subscription</b></p>
                    <p className="text-base text-black">Early Access</p>
                </div>

                <div>
                    <p className="text-sm text-black"><b>Remaining Credits</b></p>
                    <p className="text-base text-black">Poster Credits: {credits.posterGen} </p>
                    <p className="text-base text-black">CarJam Credits: {credits.carJam}</p>
                    <p className="text-base text-black">AI Credits: {credits.ai}</p>
                </div>

                {/* Save button */}
                <button
                    onClick={handleSaveChanges}
                    disabled={!canSave}
                    className={`
                        w-full mt-4 py-2 rounded-md text-sm font-medium transition-all
                        ${canSave
                            ? 'bg-green-500 hover:bg-green-700 text-white'
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
                    // bg-gradient-to-br from-purple-600 to-blue-500
                    className="px-5 py-2 rounded-lg bg-white text-gray-800 shadow-md
                border border-gray-200
                hover:bg-gray-50 transition"
                >
                    Back
                </button>

                <button
                    onClick={handleLogout}
                   className="px-5 py-2 rounded-lg bg-white border-3 border-red-500 text-red-500 text-sm"
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
                    className="fixed inset-0 z-50 flex items-center justify-center px-6"
                    onClick={() => setShowOverlay(false)}
                >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />

                    {/* Card */}
                    <div
                        className="
        relative
        max-w-sm w-full
        rounded-2xl
        bg-gradient-to-br from-gray-900 to-gray-800
        border border-cyan-500/40
        shadow-xl shadow-cyan-500/10
        px-6 py-5
        text-sm text-white
        text-left
      "
                        onClick={(e) => e.stopPropagation()}
                    >
                        <p className="font-medium">
                            Add your username and Instagram handle here.
                        </p>

                        <p className="mt-3 text-gray-300">
                            Your handle will appear on your posters.
                        </p>
                    </div>
                </div>
            )}


        </div>
    )
}
