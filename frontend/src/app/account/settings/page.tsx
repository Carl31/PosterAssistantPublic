/* eslint-disable @typescript-eslint/no-explicit-any */

// src/app/account/settings/page.tsx

'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
    getAuth,
    onAuthStateChanged,
    signOut,
    updateProfile,
    sendPasswordResetEmail,
    updateEmail,
} from 'firebase/auth'
import { doc, getFirestore, updateDoc, onSnapshot } from 'firebase/firestore'
import { Credit } from '@/types/credit'
import { motion } from 'framer-motion'
import { notify } from '@/utils/notify'

export default function AccountSettingsPage() {
    const searchParams = useSearchParams()
    const showFinalTutorialFlag = searchParams!.get('final') === 'true'

    const router = useRouter()
    const auth = getAuth()
    const db = getFirestore()

    /* ---------------------------------------------------------------------
       Identity + account state
    --------------------------------------------------------------------- */
    const [email, setEmail] = useState<string | null>(null)
    const [credits, setCredits] = useState<Credit>({
        carJam: 0,
        ai: 0,
        posterGen: 0,
    })

    /* ---------------------------------------------------------------------
       Editable profile state
    --------------------------------------------------------------------- */
    const [name, setName] = useState('')
    const [instagramHandle, setInstagramHandle] = useState('')

    /* ---------------------------------------------------------------------
       Original values (used for change detection)
    --------------------------------------------------------------------- */
    const [originalName, setOriginalName] = useState('')
    const [originalInstagram, setOriginalInstagram] = useState('')
    const [removeIgButton, setRemoveIgButton] = useState(false)
    const [originalRemoveIgButton, setOriginalRemoveIgButton] = useState(false)

    /* ---------------------------------------------------------------------
       UI state
    --------------------------------------------------------------------- */
    const [showLogoutPopup, setShowLogoutPopup] = useState(false)
    const [showOverlay, setShowOverlay] = useState(false)

    const [showDisplaySettings, setShowDisplaySettings] = useState(false)
    const [showCreditsDropdown, setShowCreditsDropdown] = useState(false)
    const [showSecurityDropdown, setShowSecurityDropdown] = useState(false)

    const [showTooltip, setShowTooltip] = useState(false)

    const [showEmailModal, setShowEmailModal] = useState(false)
    const [showResetModal, setShowResetModal] = useState(false)

    const [newEmail, setNewEmail] = useState('')

    /* ---------------------------------------------------------------------
       Load user data (auth + Firestore sync)
    --------------------------------------------------------------------- */
    useEffect(() => {
        if (showFinalTutorialFlag) setShowOverlay(true)

        const unsubAuth = onAuthStateChanged(auth, (user) => {
            if (!user) return

            setEmail(user.email ?? '')

            const userRef = doc(db, 'users', user.uid)

            const unsubUser = onSnapshot(userRef, (snap) => {
                if (!snap.exists()) return

                const data = snap.data()

                setName(data.displayName ?? '')
                setInstagramHandle(data.instagramHandle ?? '')

                setOriginalName(data.displayName ?? '')
                setOriginalInstagram(data.instagramHandle ?? '')

                setCredits(data.credits ?? { carJam: 0, ai: 0, posterGen: 0 })

                const remove = data.settings?.removeIgButton ?? false
                setRemoveIgButton(remove)
                setOriginalRemoveIgButton(remove)
            })

            return unsubUser
        })

        return () => unsubAuth()
    }, [])

    /* ---------------------------------------------------------------------
       Derived state
    --------------------------------------------------------------------- */
    const hasChanges =
        name !== originalName ||
        instagramHandle !== originalInstagram ||
        removeIgButton !== originalRemoveIgButton

    const isProfileComplete =
        name.trim() !== '' && instagramHandle.trim() !== ''

    const isProfileSaved =
        originalName.trim() !== '' && originalInstagram.trim() !== ''

    const canSave = hasChanges && isProfileComplete

    /* ---------------------------------------------------------------------
       Actions: profile
    --------------------------------------------------------------------- */
    const handleSaveChanges = async () => {
        if (!auth.currentUser || !canSave) return

        const userRef = doc(db, 'users', auth.currentUser.uid)

        await updateDoc(userRef, {
            displayName: name,
            instagramHandle: instagramHandle,
            'settings.removeIgButton': removeIgButton,
        })

        if (auth.currentUser.displayName !== name) {
            await updateProfile(auth.currentUser, { displayName: name })
        }

        setOriginalName(name)
        setOriginalInstagram(instagramHandle)
        setOriginalRemoveIgButton(removeIgButton)
    }

    /* ---------------------------------------------------------------------
       Actions: auth
    --------------------------------------------------------------------- */
    const handlePasswordReset = async () => {
        if (!auth.currentUser?.email) return
        await sendPasswordResetEmail(auth, auth.currentUser.email)
        notify('info', 'Password reset email sent.')
    }

    const handleChangeEmail = async () => {
        if (!auth.currentUser || !newEmail.trim()) return

        try {
            await updateEmail(auth.currentUser, newEmail.trim())

            const userRef = doc(db, 'users', auth.currentUser.uid)
            await updateDoc(userRef, { email: newEmail.trim() })

            setEmail(newEmail.trim())
            setNewEmail('')
            notify('success', 'Email updated successfully.')
        } catch (err: any) {
            notify('error', err.message || 'Failed to update email.')
        }
    }

    /* ---------------------------------------------------------------------
       Navigation + session
    --------------------------------------------------------------------- */
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
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
        >
            <div className="p-4 max-w-lg mx-auto">
                <h1 className="text-2xl font-bold mb-4 ml-1 text-black">
                    Account Settings
                </h1>

                <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
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
                            <span className="absolute inset-y-0 left-0 pl-3 pt-3 text-black">@</span>
                            <input
                                type="text"
                                value={instagramHandle}
                                onChange={(e) => setInstagramHandle(e.target.value)}
                                className="w-full mt-1 p-2 pl-8 rounded-md bg-gray-100 text-black border-2 border-gray-700 focus:ring-2 focus:ring-black"
                            />
                        </div>
                    </div>

                    {/* Email display */}
                    <div>
                        <p className="text-sm text-black"><b>Email</b></p>
                        <p className="text-base font-medium text-black">{email || '—'}</p>
                    </div>

                    {/* Account Security Dropdown */}
                    <div className="pt-2">
                        <button
                            type="button"
                            onClick={() => setShowSecurityDropdown((v) => !v)}
                            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition"
                        >
                            <motion.span
                                animate={{ rotate: showSecurityDropdown ? 90 : 0 }}
                                transition={{ duration: 0.15, ease: 'linear' }}
                            >
                                ▶
                            </motion.span>
                            <span className="font-medium">Account security</span>
                        </button>

                        {showSecurityDropdown && (
                            <div className="mt-3 space-y-2">
                                <button
                                    onClick={() => setShowEmailModal(true)}
                                    className="w-full py-2 rounded-md text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white transition"
                                >
                                    Change Email
                                </button>

                                {/* Same styling as Change Email */}
                                <button
                                    onClick={() => setShowResetModal(true)}
                                    className="w-full py-2 rounded-md text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white transition"
                                >
                                    Reset Password
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Credits Dropdown */}
                    <div>
                        <button
                            type="button"
                            onClick={() => setShowCreditsDropdown((v) => !v)}
                            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition"
                        >
                            <motion.span
                                animate={{ rotate: showCreditsDropdown ? 90 : 0 }}
                                transition={{ duration: 0.15, ease: 'linear' }}
                            >
                                ▶
                            </motion.span>
                            <span className="font-medium">Remaining credits</span>
                        </button>

                        {showCreditsDropdown && (
                            <div className="mt-2 space-y-1">
                                <p className="text-base text-black">Poster Credits: {credits.posterGen}</p>
                                <p className="text-base text-black">CarJam Credits: {credits.carJam}</p>
                                <p className="text-base text-black">AI Credits: {credits.ai}</p>
                            </div>
                        )}
                    </div>

                    {/* Display Settings */}
                    <div className="">
                        <button
                            type="button"
                            onClick={() => setShowDisplaySettings((v) => !v)}
                            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition"
                        >
                            <motion.span
                                animate={{ rotate: showDisplaySettings ? 90 : 0 }}
                                transition={{ duration: 0.15, ease: 'linear' }}
                            >
                                ▶
                            </motion.span>
                            <span className="font-medium">Display page</span>
                        </button>

                        {showDisplaySettings && (
                            <div className="mt-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm text-black"><b>Show Instagram button</b></p>

                                        <div className="relative">
                                            <button
                                                onClick={() => setShowTooltip((v) => !v)}
                                                className="w-4 h-4 rounded-full bg-gray-300 text-[10px] flex items-center justify-center text-gray-700"
                                            >
                                                ?
                                            </button>

                                            {showTooltip && (
                                                <div className="absolute z-50 w-[220px] text-xs bg-gray-700 text-white p-2 rounded shadow left-1/2 -translate-x-1/2 top-6">
                                                    Hide or show the Instagram button on the display page alongside the QR code (recommended to leave on).
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => {
                                            setRemoveIgButton((v) => {
                                                const next = !v
                                                notify(
                                                    'info',
                                                    next
                                                        ? 'Instagram button removed from poster showcase screen.'
                                                        : 'Instagram button restored on poster showcase screen.'
                                                )
                                                return next
                                            })
                                        }}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${!removeIgButton ? 'bg-blue-500' : 'bg-gray-400'
                                            }`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${!removeIgButton ? 'translate-x-6' : 'translate-x-1'
                                                }`}
                                        />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Save */}
                    <button
                        onClick={handleSaveChanges}
                        disabled={!canSave}
                        className={`w-full mt-4 py-2 rounded-md text-sm font-medium transition-all ${canSave
                                ? 'bg-green-500 hover:bg-green-700 text-white'
                                : 'bg-green-900/40 text-green-300 cursor-not-allowed'
                            }`}
                    >
                        Save changes
                    </button>
                </div>

                {/* Navigation */}
                <div className="flex justify-between mt-4">
                    <button
                        onClick={handleBack}
                        className="px-5 py-2 rounded-lg bg-white text-gray-800 shadow-md border border-gray-200 hover:bg-gray-50 transition"
                    >
                        Back
                    </button>

                    <button
                        onClick={handleLogout}
                        className="px-5 py-2 rounded-lg bg-white border-2 border-red-500 text-red-500 text-sm"
                    >
                        Sign Out
                    </button>
                </div>

                {/* Reset Password Modal */}
                {showResetModal && (
                    <div className="fixed inset-0 flex items-center justify-center backdrop-blur-sm z-50">
                        <div className="bg-white rounded-lg p-5 w-full max-w-sm">
                            <p className="text-sm font-medium text-black mb-3">
                                Press confirm to send a password reset link to your email
                            </p>

                            <div className="flex justify-end gap-2 mt-4">
                                <button
                                    onClick={() => setShowResetModal(false)}
                                    className="px-4 py-2 bg-gray-200 rounded text-gray-700"
                                >
                                    Cancel
                                </button>

                                <button
                                    onClick={async () => {
                                        await handlePasswordReset()
                                        setShowResetModal(false)
                                    }}
                                    className="px-4 py-2 bg-blue-500 text-white rounded"
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Email modal */}
                {showEmailModal && (
                    <div className="fixed inset-0 flex items-center justify-center backdrop-blur-sm z-50">
                        <div className="bg-white rounded-lg p-5 w-full max-w-sm">
                            <p className="text-sm font-medium text-black mb-3">
                                Please input new email
                            </p>

                            <input
                                type="email"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                className="w-full p-2 rounded-md bg-gray-100 text-black border-2 border-gray-700 focus:ring-2 focus:ring-black"
                                placeholder="New email"
                            />

                            <div className="flex justify-end gap-2 mt-4">
                                <button
                                    onClick={() => {
                                        setShowEmailModal(false)
                                        setNewEmail('')
                                    }}
                                    className="px-4 py-2 bg-gray-200 rounded text-gray-700"
                                >
                                    Cancel
                                </button>

                                <button
                                    onClick={async () => {
                                        await handleChangeEmail()
                                        setShowEmailModal(false)
                                    }}
                                    className="px-4 py-2 bg-blue-500 text-white rounded"
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Logout modal */}
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
                                    className="px-4 py-2 bg-gray-300 rounded text-gray-500"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Overlay */}
                {showOverlay && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center px-6"
                        onClick={() => setShowOverlay(false)}
                    >
                        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />

                        <div
                            className="relative max-w-sm w-full rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 border border-cyan-500/40 shadow-xl px-6 py-5 text-sm text-white"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <p className="font-medium">
                                Add your username and Instagram handle here.
                            </p>

                            <p className="mt-3 text-gray-300">
                                Your <b>handle</b> will appear on your posters.
                            </p>
                            <p className="mt-3 text-gray-300">
                                Your <b>username</b> is only used within the app.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    )
}