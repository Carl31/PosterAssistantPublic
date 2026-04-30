'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Archivo_Black } from 'next/font/google'
import LoadingPage from '@/components/LoadingPage'
import { useEffect, useState } from 'react'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { doc, getFirestore, updateDoc, onSnapshot, getDoc } from 'firebase/firestore'
import { useAuth } from '@/context/AuthContext'
import { notify } from '@/utils/notify'

// Font configuration
const archivoBlack = Archivo_Black({
    weight: '400',
    subsets: ['latin'],
})

/* ============================================================================
 * TYPE DEFINITIONS
 * ============================================================================ */

type SupporterState = {
    isActive: boolean
    expiresAt: Date | null
}

type Credits = {
    posterGen: number
    ai: number
    carJam: number
}

type CreditPackConfig = {
    id: string
    title: string
    description: string
    iconSrc: string
    iconAlt: string
    price: number
    supporterPrice: number
    credits: {
        poster: number
        ai: number
        lookup: number
    }
    stripeLink: string
}

/* ============================================================================
 * UTILITY FUNCTIONS
 * ============================================================================ */

/**
 * Checks if a supporter subscription is currently active
 */
const checkSupporterActive = (supporter: SupporterState): boolean => {
    if (!supporter?.isActive || !supporter.expiresAt) return false

    let expiresAt: Date
    const expires = supporter.expiresAt as { seconds: number } | Date

    if ('seconds' in expires) {
        // Firestore Timestamp - convert to Date
        expiresAt = new Date(expires.seconds * 1000)
    } else {
        expiresAt = expires as Date
    }

    return expiresAt > new Date()
}

function formatExpiry(expiry: { seconds: number } | Date | undefined) {
    if (!expiry) return 'N/A';

    let date: Date;
    if ('seconds' in expiry) {
        date = new Date(expiry.seconds * 1000);
    } else {
        date = expiry as Date;
    }

    const day = date.getDate();
    const month = date.getMonth() + 1; // months are 0-indexed
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
}

/* ============================================================================
 * REUSABLE COMPONENTS
 * ============================================================================ */

/**
 * Credit Pack Card Component
 * Displays a purchasable credit pack with pricing and feature breakdown
 */
// interface CreditPackCardProps {
//     pack: CreditPackConfig
//     isSupporter: boolean
//     onPurchase: (stripeLink: string) => void
// }

// const CreditPackCard = ({ pack, isSupporter, onPurchase }: CreditPackCardProps) => {
//     const displayPrice = isSupporter ? pack.supporterPrice : pack.price

//     return (
//         <div className="group relative overflow-hidden rounded-2xl border border-blue-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
//             {/* Top gradient accent */}
//             <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 opacity-60" />

//             {/* Header section with icon and title */}
//             <div className="mb-5 flex items-start gap-4">
//                 <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-cyan-50 shadow-sm">
//                     <div className="absolute inset-0 opacity-70 [background-image:radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.25),transparent_55%),radial-gradient(circle_at_70%_80%,rgba(34,211,238,0.25),transparent_55%)]" />
//                     <div className="relative flex h-full w-full items-center justify-center">
//                         <img className="h-7 w-7" src={pack.iconSrc} alt={pack.iconAlt} />
//                     </div>
//                 </div>

//                 <div className="min-w-0 flex-1">
//                     <div className="flex flex-col gap-1">
//                         <h3 className="text-xl font-black tracking-tight text-gray-900">
//                             {pack.title}
//                         </h3>
//                         <p className="text-sm text-gray-600">{pack.description}</p>
//                     </div>

//                     {/* Pricing display */}
//                     <div className="mt-3 flex flex-wrap items-end gap-x-2 gap-y-1">
//                         {isSupporter ? (
//                             <>
//                                 <span className="text-sm font-semibold text-gray-400 line-through">
//                                     ${pack.price}
//                                 </span>
//                                 <span className="text-2xl font-black tracking-tight text-blue-600">
//                                     ${pack.supporterPrice}
//                                 </span>
//                                 <span className="text-xs font-medium text-blue-600/80">
//                                     Supporter half-price
//                                 </span>
//                             </>
//                         ) : (
//                             <>
//                                 <span className="text-2xl font-black tracking-tight text-blue-600">
//                                     ${pack.price}
//                                 </span>
//                                 <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
//                                     one-time
//                                 </span>
//                             </>
//                         )}
//                     </div>
//                 </div>
//             </div>

//             {/* Credit breakdown grid */}
//             <div className="mb-5 grid grid-cols-2 gap-2 text-xs font-semibold text-gray-700 sm:grid-cols-3">
//                 <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
//                     <span className="text-gray-500">Poster</span>
//                     <div className="mt-0.5 text-sm font-black text-gray-900">+{pack.credits.poster}</div>
//                 </div>
//                 <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
//                     <span className="text-gray-500">AI</span>
//                     <div className="mt-0.5 text-sm font-black text-gray-900">+{pack.credits.ai}</div>
//                 </div>
//                 <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
//                     <span className="text-gray-500">Lookup</span>
//                     <div className="mt-0.5 text-sm font-black text-gray-900">+{pack.credits.lookup}</div>
//                 </div>
//             </div>

//             {/* Purchase button */}
//             <button
//                 className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 py-3 text-sm font-semibold text-white shadow-md transition-all hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-cyan-300"
//                 onClick={() => onPurchase(pack.stripeLink)}
//             >
//                 Buy Pack
//             </button>
//         </div>
//     )
// }

/**
 * Modal Component
 * Reusable overlay modal with backdrop blur and click-outside-to-close
 */
interface ModalProps {
    isOpen: boolean
    onClose: () => void
    children: React.ReactNode
}

const Modal = ({ isOpen, onClose, children }: ModalProps) => {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50" onClick={onClose}>
            <div className="absolute inset-0 bg-black/70" />
            <div className="absolute inset-0 flex items-center justify-center px-6">
                <div onClick={(e) => e.stopPropagation()}>
                    {children}
                </div>
            </div>
        </div>
    )
}

/**
 * Feature List Item Component
 * Used in supporter benefits section
 */
// interface FeatureItemProps {
//     iconSrc: string
//     iconAlt: string
//     children: React.ReactNode
// }

// const FeatureItem = ({ iconSrc, iconAlt, children }: FeatureItemProps) => (
//     <li className="flex items-center gap-2 -ml-5">
//         <img
//             className="w-6 h-6 sm:w-9 sm:h-9 flex-shrink-0"
//             src={iconSrc}
//             alt={iconAlt}
//         />
//         <span>{children}</span>
//     </li>
// )

/* ============================================================================
 * MAIN COMPONENT
 * ============================================================================ */

export default function StorePage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { user } = useAuth()
    const auth = getAuth()
    const db = getFirestore()

    /* --------------------------------------------------------------------------
     * State Management
     * -------------------------------------------------------------------------- */
    const [loading, setLoading] = useState(false)
    const [credits, setCredits] = useState<Credits>({
        posterGen: 0,
        ai: 0,
        carJam: 0,
    })
    const [hasPackUnlocks, setHasPackUnlocks] = useState<boolean>(false)
    const [supporter, setSupporter] = useState<SupporterState>({
        isActive: false,
        expiresAt: null,
    })
    const [supporterCount, setSupporterCount] = useState<number>(0)

    // Modal states
    const [showStorePopup, setShowStorePopup] = useState(false)
    const [boughtCreditsPopup, setBoughtCreditsPopup] = useState(false)
    const [boughtSupporterPopup, setBoughtSupporterPopup] = useState(false)
    const [dontShowAgainStorePopup, setDontShowAgainStorePopup] = useState(false)

    /* --------------------------------------------------------------------------
     * Derived State
     * -------------------------------------------------------------------------- */
    const isSupporter = checkSupporterActive(supporter)
    const hasUnlocks = Boolean(hasPackUnlocks)

    /* --------------------------------------------------------------------------
     * Credit Pack Configuration
     * -------------------------------------------------------------------------- */
    const creditPacks: CreditPackConfig[] = [
        {
            id: 'rolling-shot-toolkit',
            title: 'Poster Toolkit',
            description: 'Quick start to creating your next standout poster.',
            iconSrc: '/svg/poster_credit_black.svg',
            iconAlt: 'Poster Credits',
            price: 8,
            supporterPrice: 4,
            credits: { poster: 5, ai: 5, lookup: 5 },
            stripeLink: 'small',
        },
        {
            id: 'creative-pack',
            title: 'Creative Pack',
            description: 'For photographers looking to grow their portfolio.',
            iconSrc: '/svg/poster_credit_black.svg',
            iconAlt: 'Poster Credits',
            price: 14,
            supporterPrice: 7,
            credits: { poster: 15, ai: 15, lookup: 15 },
            stripeLink: 'large',
        },
    ]

    /* --------------------------------------------------------------------------
     * Event Handlers
     * -------------------------------------------------------------------------- */

    async function handlePurchase(stripeLink: string) {
        notify("info", "Redirecting to payment portal...");
        setLoading(true)
        const auth = getAuth()
        const user = auth.currentUser
        if (!user) return

        const token = await user.getIdToken()

        const res = await fetch('/api/checkout/credit-pack', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ stripeLink, isSupporter }),
        })

        if (!res.ok) {
            const text = await res.text()
            throw new Error(text || 'Checkout failed')
        }

        const data = await res.json()
        if (data.url) {
            window.location.href = data.url
        }
    }

    async function handleSupporterBtnClick() {
        if (isSupporter) return
        notify("info", "Redirecting to payment portal...");
        setLoading(true)

        const auth = getAuth()
        const user = auth.currentUser
        if (!user) return

        const token = await user.getIdToken()

        const res = await fetch('/api/checkout/supporter', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })

        const data = await res.json()
        if (data.url) {
            window.location.href = data.url
        }
    }

    const handleCloseStorePopup = async () => {
        setShowStorePopup(false)

        if (dontShowAgainStorePopup && user?.uid) {
            await updateDoc(doc(db, 'users', user.uid), {
                'settings.hideStorePopup': true,
            })
        }
    }

    /* --------------------------------------------------------------------------
     * Effects
     * -------------------------------------------------------------------------- */

    // Handle URL query parameters for purchase confirmation popups
    useEffect(() => {
        setBoughtCreditsPopup(searchParams?.get('credits') === 'true')
        setBoughtSupporterPopup(searchParams?.get('supporter') === 'true')
    }, [searchParams])

    // Subscribe to user data from Firestore
    useEffect(() => {
        const unsubAuth = onAuthStateChanged(auth, (authUser) => {
            if (!authUser) return

            const userRef = doc(db, 'users', authUser.uid)

            const unsubUser = onSnapshot(userRef, async (snap) => {
                if (!snap.exists()) return

                const data = snap.data()

                // Normalize data with defaults
                const credits = data.credits ?? {
                    posterGen: 0,
                    ai: 0,
                    carJam: 0,
                }

                const hasPackUnlocks =
                    typeof data.hasPackUnlocks === 'boolean'
                        ? data.hasPackUnlocks
                        : false

                const supporter =
                    data.supporter && typeof data.supporter === 'object'
                        ? {
                            isActive: Boolean(data.supporter.isActive),
                            expiresAt: data.supporter.expiresAt ?? null,
                        }
                        : {
                            isActive: false,
                            expiresAt: null,
                        }

                // Backfill missing fields if needed
                const needsBackfill =
                    data.hasPackUnlocks === undefined || data.supporter === undefined

                if (needsBackfill) {
                    await updateDoc(userRef, {
                        hasPackUnlocks,
                        supporter,
                    })
                }

                // Update local state
                setCredits(credits)
                setHasPackUnlocks(hasPackUnlocks)
                setSupporter(supporter)

                // Show welcome popup if user hasn't dismissed it
                if (!data.settings?.hideStorePopup) {
                    setShowStorePopup(true)
                }
            })

            return unsubUser
        })

        return () => unsubAuth()
    }, [auth, db])

    // Fetch supporter count
    useEffect(() => {
        const fetchCount = async () => {
            const ref = doc(db, 'app', 'supporterCount')
            const snap = await getDoc(ref)

            if (snap.exists()) {
                setSupporterCount(snap.data().value ?? 0)
            }
        }

        fetchCount()
    }, [db])

    /* --------------------------------------------------------------------------
     * Render
     * -------------------------------------------------------------------------- */

    if (!user) {
        return <LoadingPage />
    }

    return (
        <>
            {loading ? (
                <LoadingPage />
            ) : (
                <div className="flex min-h-screen flex-col items-center bg-gradient-to-br from-gray-50 via-blue-50/30 to-cyan-50/30 px-1 py-8">
                    {/* Page Header */}

                    <div className="p-[4px] rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 mb-3">
                        <div className="bg-white rounded-xl p-6">
                            <h1 className={`text-3xl sm:text-4xl md:text-5xl text-blue-400 text-center mb-2 ${archivoBlack.className}`}>
                                Store
                            </h1>
                            <p className="text-sm text-gray-600 sm:text-base text-center">
                                Choose a pack to unlock premium features and support development.
                            </p>

                        </div>
                    </div>

                    {/* Pack Unlocks Status */}
                    {hasUnlocks && (
                        <div className="mt-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2">
                            <img
                                className="h-5 w-5"
                                src="/svg/checkmark.svg"
                                alt="Unlocked"
                            />
                            <p className="text-sm font-semibold text-green-700">
                                Pack features unlocked
                            </p>
                        </div>
                    )}
                    {!isSupporter && supporter.expiresAt && (
                        <p className="mt-3 text-xs text-red-500">
                            Supporter expired on {formatExpiry(supporter.expiresAt)}.
                        </p>
                    )}

                    {/* Current Credits Display */}
                    <section className="mb-10 w-full max-w-7xl mt-4">
                        <div className="rounded-2xl border border-blue-200 bg-white p-6 shadow-md">

                            <h2 className="mb-4 text-lg font-bold text-gray-900">
                                Your Current Credits
                            </h2>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                {/* Poster Credits */}
                                <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gradient-to-br from-blue-50 to-white p-4">
                                    <img
                                        className="h-10 w-10 flex-shrink-0"
                                        src="/svg/poster_credit_black.svg"
                                        alt="Poster Credits"
                                    />
                                    <div>
                                        <p className="text-xs font-medium text-gray-600">Poster Credits</p>
                                        <p className="text-2xl font-black text-blue-600">{credits.posterGen}</p>
                                        <p className="text-gray-400 text-xs">Used to generate a poster.</p>
                                    </div>
                                </div>

                                {/* AI Credits */}
                                <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gradient-to-br from-cyan-50 to-white p-4">
                                    <img
                                        className="h-10 w-10 flex-shrink-0"
                                        src="/svg/ai_credit_black.svg"
                                        alt="AI Credits"
                                    />
                                    <div>
                                        <p className="text-xs font-medium text-gray-600">AI Credits</p>
                                        <p className="text-2xl font-black text-cyan-600">{credits.ai}</p>
                                        <p className="text-gray-400 text-xs">Used to identify the vehicle using AI.</p>
                                    </div>
                                </div>

                                {/* Carjam Credits */}
                                <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gradient-to-br from-indigo-50 to-white p-4">
                                    <img
                                        className="h-10 w-10 flex-shrink-0"
                                        src="/svg/carjam_credit_black.svg"
                                        alt="Carjam Credits"
                                    />
                                    <div>
                                        <p className="text-xs font-medium text-gray-600">Lookup Credits</p>
                                        <p className="text-2xl font-black text-indigo-600">{credits.carJam}</p>
                                        <p className="text-gray-400 text-xs">Used to identify the exact vehicle using its license plate.</p>
                                    </div>
                                </div>

                                <div className="lg:flex lg:flex-col lg:items-center lg:justify-center">
                                    <div className="mt-3 mb-3 flex items-center gap-2 lg:justify-center">
                                        <img
                                            className="w-4 h-4"
                                            src="/svg/template_hollow.svg"
                                            alt="template"
                                        />
                                        <p className="text-base font-semibold text-gray-600 tracking-wide">
                                            Templates
                                        </p>
                                    </div>

                                    <ul className="space-y-3 text-sm lg:flex lg:flex-col lg:items-center lg:justify-center">
                                        {/* Basic */}
                                        <li className="relative flex items-center justify-between overflow-hidden rounded-xl border border-sky-400 bg-gradient-to-br from-sky-400 to-sky-600 px-5 py-2.5 shadow-[0_0_18px_rgba(56,189,248,0.2)] lg:w-64">
                                            <span className="font-medium text-white">Basic</span>
                                            <img className="w-4 h-4" src="/svg/checkmark.svg" alt="Unlocked" />
                                            <span className="pointer-events-none absolute inset-0 bg-white/25 blur-md" />
                                        </li>

                                        {/* Pro */}
                                        <li
                                            className={`relative flex items-center justify-between overflow-hidden rounded-xl border px-5 py-2.5 lg:w-64 ${hasUnlocks
                                                    ? "border-sky-400 bg-gradient-to-br from-sky-400 to-sky-600 shadow-[0_0_22px_rgba(56,189,248,0.2)]"
                                                    : "border-gray-300 bg-gradient-to-br from-gray-200 to-gray-300"
                                                }`}
                                        >
                                            <span className={`font-medium ${hasUnlocks ? "text-white" : "text-gray-600"}`}>
                                                Pro
                                            </span>

                                            {hasUnlocks ? (
                                                <img className="w-4 h-4" src="/svg/checkmark.svg" alt="Unlocked" />
                                            ) : (
                                                <img className="w-3 h-3 opacity-70" src="/svg/lock_icon.svg" alt="Locked" />
                                            )}

                                            {hasUnlocks && (
                                                <span className="pointer-events-none absolute inset-0 bg-white/25 blur-md" />
                                            )}
                                        </li>

                                        {/* Designer */}
                                        <li
                                            className={`relative flex items-center justify-between overflow-hidden rounded-xl border px-5 py-2.5 lg:w-64 ${isSupporter
                                                    ? "border-cyan-400 bg-gradient-to-br from-sky-400 to-sky-600 shadow-[0_0_28px_rgba(34,211,238,0.2)]"
                                                    : "border-gray-300 bg-gradient-to-br from-gray-200 to-gray-300"
                                                }`}
                                        >
                                            <span className={`font-medium ${isSupporter ? "text-white" : "text-gray-600"}`}>
                                                Designer
                                            </span>

                                            {isSupporter ? (
                                                <img className="w-4 h-4" src="/svg/checkmark.svg" alt="Unlocked" />
                                            ) : (
                                                <img className="w-3 h-3 opacity-70" src="/svg/lock_icon.svg" alt="Locked" />
                                            )}

                                            {isSupporter && (
                                                <span className="pointer-events-none absolute inset-0 bg-white/30 blur-md" />
                                            )}
                                        </li>
                                    </ul>
                                </div>

                            </div>

                        </div>
                    </section>

                    {/* Credit Packs Grid */}
                    <section className="mb-10 mt-3 w-full max-w-7xl">
                        <div className="mb-2 flex items-end">
                            <h2 className="text-3xl font-bold text-gray-900">
                                Credit Packs
                            </h2>

                            <p className="text-xs text-gray-500 ml-2 mb-1">
                                Store: <span className="font-bold text-gray-900">$USD</span>
                            </p>
                        </div>

                        <ul className="mb-6 space-y-2 text-m text-gray-500">
                            <li className="flex gap-2">
                                <span className="mt-[2px] text-gray-400">•</span>
                                <span>Credits stack and will <span className="font-semibold text-gray-800">never</span> expire.</span>
                            </li>

                            <li className="flex gap-2">
                                <span className="mt-[2px] text-gray-400">•</span>
                                <span>
                                    Purchase of <span className="font-semibold text-gray-800">any pack</span> unlocks additional features <span className="font-semibold text-gray-800">for ever</span>.
                                </span>
                            </li>
                        </ul>



                        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                            {creditPacks.map((pack) => (
                                <div
                                    key={pack.id}
                                    className="group relative overflow-hidden rounded-3xl border-2 border-blue-300 bg-white p-8 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-blue-400 hover:shadow-2xl"
                                >
                                    {/* Header with icon */}
                                    <div className="mb-6 flex items-start gap-5">
                                        <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-2xl border-2 border-gray-200 bg-gradient-to-br from-gray-50 via-white to-cyan-50 shadow-md">
                                            <div className="absolute inset-0 opacity-70 [background-image:radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.25),transparent_55%),radial-gradient(circle_at_70%_80%,rgba(34,211,238,0.25),transparent_55%)]" />

                                            <div className="relative flex h-full w-full items-center justify-center">
                                                <img className="h-8 w-8" src={pack.iconSrc} alt={pack.iconAlt} />
                                            </div>
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-2xl font-black tracking-tight text-gray-900">
                                                {pack.title}
                                            </h3>

                                            {/* Pricing */}
                                            <div className="mt-3 flex flex-wrap items-end gap-x-2 gap-y-1">
                                                {isSupporter ? (
                                                    <>
                                                        <span className="text-base font-semibold text-gray-400 line-through">
                                                            ${pack.price}
                                                        </span>
                                                        <span className="text-3xl font-black tracking-tight text-blue-600">
                                                            ${pack.supporterPrice}
                                                        </span>
                                                        <span className="text-sm font-bold text-blue-600">
                                                            Supporter 50% off
                                                        </span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="text-3xl font-black tracking-tight text-gray-900">
                                                            ${pack.price}
                                                        </span>
                                                        <span className="text-sm font-bold uppercase tracking-wide text-gray-500">
                                                            one-time
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <p className="mb-6 text-base leading-relaxed text-gray-600">
                                        {pack.description}
                                    </p>

                                    {/* Credit breakdown with distinct colors */}
                                    <div className="mb-6 grid grid-cols-3 gap-3">
                                        {/* Poster Credits - Blue */}
                                        <div className="group/card flex flex-col items-center rounded-xl border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-blue-100/50 p-4 shadow-sm transition-all hover:border-blue-400 hover:shadow-md">
                                            <img
                                                className="mb-2 h-7 w-7 opacity-90 transition-opacity group-hover/card:opacity-100"
                                                src="/svg/poster_credit_black.svg"
                                                alt="Poster Credits"
                                            />
                                            <span className="text-sm font-semibold text-gray-600">Poster</span>
                                            <div className="mt-1 text-2xl font-black text-blue-600">+{pack.credits.poster}</div>
                                        </div>

                                        {/* AI Credits - Emerald/Green */}
                                        <div className="group/card flex flex-col items-center rounded-xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-4 shadow-sm transition-all hover:border-emerald-400 hover:shadow-md">
                                            <img
                                                className="mb-2 h-7 w-7 opacity-90 transition-opacity group-hover/card:opacity-100"
                                                src="/svg/ai_credit_black.svg"
                                                alt="AI Credits"
                                            />
                                            <span className="text-sm font-semibold text-gray-600">AI</span>
                                            <div className="mt-1 text-2xl font-black text-emerald-600">+{pack.credits.ai}</div>
                                        </div>

                                        {/* Lookup Credits - Purple */}
                                        <div className="group/card flex flex-col items-center rounded-xl border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-purple-100/50 p-4 shadow-sm transition-all hover:border-purple-400 hover:shadow-md">
                                            <img
                                                className="mb-2 h-7 w-7 opacity-90 transition-opacity group-hover/card:opacity-100"
                                                src="/svg/carjam_credit_black.svg"
                                                alt="Lookup Credits"
                                            />
                                            <span className="text-sm font-semibold text-gray-600">Lookup</span>
                                            <div className="mt-1 text-2xl font-black text-purple-600">+{pack.credits.lookup}</div>
                                        </div>
                                    </div>

                                    {/* Pack Benefits */}
                                    <div className="mb-6 rounded-xl border-2 border-gray-200 bg-gray-50 p-5">
                                        <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-600">
                                            You Unlock:
                                        </h4>
                                        <ul className="space-y-3 text-sm text-gray-700">
                                            <li className="flex items-start gap-3">
                                                <img
                                                    className="mt-0.5 h-5 w-5 flex-shrink-0"
                                                    src="/svg/checkmark.svg"
                                                    alt="Included"
                                                />
                                                <span className="leading-relaxed">Download your poster in framed + unframed format</span>
                                            </li>
                                            <li className="flex items-start gap-3">
                                                <img
                                                    className="mt-0.5 h-5 w-5 flex-shrink-0"
                                                    src="/svg/checkmark.svg"
                                                    alt="Included"
                                                />
                                                <span className="leading-relaxed">All Basic + Pro templates unlocked</span>
                                            </li>
                                            <li className="flex items-start gap-3">
                                                <img
                                                    className="mt-0.5 h-5 w-5 flex-shrink-0"
                                                    src="/svg/checkmark.svg"
                                                    alt="Included"
                                                />
                                                <span className="leading-relaxed">Showcase page customisation unlocked</span>
                                            </li>
                                        </ul>
                                    </div>

                                    {/* Purchase button */}
                                    <button
                                        className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 py-4 text-base font-bold text-white shadow-lg transition-all hover:from-blue-700 hover:to-blue-600 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-300"
                                        onClick={() => handlePurchase(pack.stripeLink)}
                                    >
                                        Buy Pack
                                    </button>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Supporter Section */}
                    <section className="mb-10 w-full max-w-7xl">
                        <div className="relative overflow-hidden rounded-3xl border-4 border-blue-300 bg-white shadow-2xl">
                            {/* Animated gradient background */}
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-100/60 via-purple-50/40 to-blue-100/60" />
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.2),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(147,51,234,0.15),transparent_50%)]" />

                            {/* Decorative elements */}
                            <div className="absolute left-0 top-0 h-40 w-40 rounded-full bg-gradient-to-br from-blue-400/30 to-purple-500/20 blur-3xl" />
                            <div className="absolute bottom-0 right-0 h-48 w-48 rounded-full bg-gradient-to-tl from-purple-400/30 to-blue-500/20 blur-3xl" />

                            <div className="relative p-8">
                                {/* Section Header */}
                                <div className="mb-10 text-center">
                                    <div className="mb-5 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md">
                                        <img
                                            className="h-4 w-4 brightness-0 invert"
                                            src="/svg/checkmark.svg"
                                            alt="Premium"
                                        />
                                        <span className="tracking-normal">
                                            Best value for active photographers
                                        </span>
                                    </div>

                                    <h2 className="mb-4 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-3xl font-black tracking-tight text-transparent">
                                        Become a Supporter
                                    </h2>

                                    <p className="text-base font-medium text-gray-600">
                                        Unlock everything and get monthly credits automatically
                                    </p>
                                </div>

                                {/* Pricing */}
                                <div className="mb-12 text-center">
                                    <div className="mb-3 flex items-end justify-center gap-2">
                                        <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-5xl font-black text-transparent">
                                            $8
                                        </span>

                                        <span className="mb-2 text-xl font-bold text-gray-500">
                                            /month
                                        </span>
                                    </div>

                                    <p className="text-sm font-semibold text-gray-500">
                                        Cancel anytime, 3-month minimum.
                                    </p>
                                </div>


                                {/* Monthly Credits Section */}
                                <div className="mb-8 rounded-xl border border-gray-200 bg-white/90 p-3 shadow-sm backdrop-blur-sm sm:p-6">
                                    <h3 className="mb-4 mt-2 text-center text-base font-bold uppercase tracking-wide text-gray-600">
                                        Monthly Credits
                                    </h3>

                                    <div className="grid grid-cols-3 gap-3 sm:gap-4">
                                        {/* Poster Credits - Blue */}
                                        <div className="group/credit flex flex-col items-center rounded-lg border border-blue-300 bg-gradient-to-br from-blue-100 via-blue-50 to-blue-100/40 p-3 sm:p-4 transition hover:border-blue-400">
                                            <img
                                                className="mb-2 h-6 w-6 opacity-90 transition group-hover/credit:opacity-100 sm:h-8 sm:w-8"
                                                src="/svg/poster_credit_black.svg"
                                                alt="Poster Credits"
                                            />
                                            <span className="text-[10px] font-semibold text-gray-600 sm:text-xs">
                                                Poster
                                            </span>
                                            <div className="text-lg font-black text-blue-600 sm:text-2xl">
                                                +10
                                            </div>
                                            <span className="text-[10px] text-gray-500 sm:text-xs">
                                                /mo
                                            </span>
                                        </div>

                                        {/* AI Credits - Emerald */}
                                        <div className="group/credit flex flex-col items-center rounded-lg border border-emerald-300 bg-gradient-to-br from-emerald-100 via-emerald-50 to-emerald-100/40 p-3 sm:p-4 transition hover:border-emerald-400">
                                            <img
                                                className="mb-2 h-6 w-6 opacity-90 transition group-hover/credit:opacity-100 sm:h-8 sm:w-8"
                                                src="/svg/ai_credit_black.svg"
                                                alt="AI Credits"
                                            />
                                            <span className="text-[10px] font-semibold text-gray-600 sm:text-xs">
                                                AI
                                            </span>
                                            <div className="text-lg font-black text-emerald-600 sm:text-2xl">
                                                +10
                                            </div>
                                            <span className="text-[10px] text-gray-500 sm:text-xs">
                                                /mo
                                            </span>
                                        </div>

                                        {/* Lookup Credits - Purple */}
                                        <div className="group/credit flex flex-col items-center rounded-lg border border-purple-300 bg-gradient-to-br from-purple-100 via-purple-50 to-purple-100/40 p-3 sm:p-4 transition hover:border-purple-400">
                                            <img
                                                className="mb-2 h-6 w-6 opacity-90 transition group-hover/credit:opacity-100 sm:h-8 sm:w-8"
                                                src="/svg/carjam_credit_black.svg"
                                                alt="Lookup Credits"
                                            />
                                            <span className="text-[10px] font-semibold text-gray-600 sm:text-xs">
                                                Lookup
                                            </span>
                                            <div className="text-lg font-black text-purple-600 sm:text-2xl">
                                                +10
                                            </div>
                                            <span className="text-[10px] text-gray-500 sm:text-xs">
                                                /mo
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Benefits List */}
                                <div className="mb-10 rounded-2xl border-2 border-gray-200 bg-white/90 p-5 shadow-lg backdrop-blur-sm">
                                    <h3 className="mb-6 text-center text-base font-bold uppercase tracking-wide text-gray-600">
                                        Exclusive Benefits
                                    </h3>
                                    <ul className="space-y-2 text-base text-gray-700">
                                        <li className="flex items-center gap-4 rounded-xl bg-gradient-to-r from-blue-50/60 to-transparent p-3 transition-colors hover:from-blue-50">
                                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-500 shadow-md">
                                                <img
                                                    className="h-5 w-5 brightness-0 invert"
                                                    src="/svg/checkmark.svg"
                                                    alt="Included"
                                                />
                                            </div>
                                            <span className="leading-relaxed">
                                                <b>All</b> credit pack features unlocked
                                            </span>
                                        </li>
                                        <li className="flex items-center gap-4 rounded-xl bg-gradient-to-r from-emerald-50/60 to-transparent p-3 transition-colors hover:from-emerald-50">
                                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-500 shadow-md">
                                                <img
                                                    className="h-5 w-5 brightness-0 invert"
                                                    src="/svg/checkmark.svg"
                                                    alt="Included"
                                                />
                                            </div>
                                            <span className="leading-relaxed">
                                                All <b>Designer</b> templates unlocked
                                            </span>
                                        </li>
                                        <li className="flex items-center gap-4 rounded-xl bg-gradient-to-r from-purple-50/60 to-transparent p-3 transition-colors hover:from-purple-50">
                                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-500 shadow-md">
                                                <img
                                                    className="h-5 w-5 brightness-0 invert"
                                                    src="/svg/checkmark.svg"
                                                    alt="Included"
                                                />
                                            </div>
                                            <span className="leading-relaxed">All future templates unlocked</span>
                                        </li>
                                        <li className="flex items-center gap-4 rounded-xl bg-gradient-to-r from-blue-50/60 to-transparent p-3 transition-colors hover:from-blue-50">
                                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-700 to-purple-600 shadow-md">
                                                <img
                                                    className="h-5 w-5 brightness-0 invert"
                                                    src="/svg/checkmark.svg"
                                                    alt="Included"
                                                />
                                            </div>
                                            <span className="leading-relaxed">
                                                <b>Bonus:</b> 50% off all credit packs
                                            </span>
                                        </li>
                                    </ul>
                                </div>

                                {/* CTA Button */}
                                <div className="flex flex-col items-center">
                                    <button
                                        disabled={isSupporter}
                                        className="group relative w-full max-w-sm overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 py-5 text-lg font-bold text-white shadow-2xl transition-all hover:scale-105 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-blue-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                                        onClick={handleSupporterBtnClick}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 opacity-0 transition-opacity group-hover:opacity-100" />
                                        <span className="relative">
                                            {isSupporter ? '✓ Supporter Active' : 'Become a Supporter'}
                                        </span>
                                    </button>
                                    <div className="mt-5 flex items-center gap-2 text-sm text-gray-600">
                                        <div className="h-2 w-2 rounded-full bg-green-500 shadow-sm shadow-green-500/50 animate-pulse" />
                                        <span>
                                            <span className="font-bold text-gray-800">{supporterCount}</span> current supporters
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Back Button */}
                    <button
                        onClick={() => router.replace('/account/dashboard')}
                        className="mb-4 w-full max-w-[160px] rounded-xl border-2 border-gray-300 bg-white py-3 text-base font-semibold text-gray-800 shadow-md transition-all hover:bg-gray-50 hover:shadow-lg disabled:opacity-50"
                    >
                        Back
                    </button>
                </div>
            )}

            {/* Welcome Modal */}
            <Modal isOpen={showStorePopup} onClose={handleCloseStorePopup}>
                <div className="mt-[-170px] max-w-sm whitespace-pre-line rounded-xl border border-white bg-gray-700/50 px-6 py-4 text-sm text-white backdrop-blur-sm">
                    <img
                        className="mx-auto mb-2 block h-8 w-8 flex-shrink-0 sm:h-10 sm:w-10"
                        src="/svg/shop.svg"
                        alt="Shop"
                    />
                    <div className="mb-4 text-base font-semibold">
                        <p>Welcome to the store!</p>
                    </div>

                    <div className="mb-6">
                        <p className="text-gray-300">
                            Here you can see your remaining credits, see unlockable features and buy packs.
                            <br />
                            <br />
                        </p>

                        <p>
                            This app is built and maintained by a single human, so your support has a very
                            real impact on how it can grow and improve.
                        </p>
                        <br />
                        <div className="mx-auto mb-4 block h-[3px] w-[40px] rounded-full bg-white/30" />

                        <p className="text-gray-300">
                            If you have any questions, please don&apos;t hesitate to reach out :)
                        </p>
                        <br />
                        <p className="text-gray-300">- Carlos @sickshotsnz</p>
                    </div>

                    <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-400 opacity-90">
                        <input
                            type="checkbox"
                            checked={dontShowAgainStorePopup}
                            onChange={(e) => setDontShowAgainStorePopup(e.target.checked)}
                            className="accent-cyan-400"
                        />
                        <span>Don&apos;t show this again</span>
                    </label>
                </div>
            </Modal>

            {/* Purchase Success Modal */}
            <Modal
                isOpen={boughtCreditsPopup}
                onClose={() => setBoughtCreditsPopup(false)}
            >
                <div className="mt-[-150px] max-w-sm whitespace-pre-line rounded-xl border border-white bg-gray-700/50 px-6 py-4 text-sm text-white backdrop-blur-sm">
                    <img
                        className="mx-auto mb-2 block h-8 w-8 flex-shrink-0 sm:h-10 sm:w-10"
                        src="/svg/confetti.svg"
                        alt="Confetti"
                    />
                    <div className="mb-4 text-base font-semibold">
                        <p>Thank you for your purchase!</p>
                    </div>

                    <div className="mb-6">
                        <p className="text-gray-300">
                            Your pack has been successfully added to your account. I hope you enjoy the
                            additional features!
                            <br />
                            <br />
                        </p>

                        <p>
                            If you have any questions or need further assistance, please don&apos;t hesitate
                            to reach out to me.
                        </p>
                        <br />
                        <p>- Carlos @sickshotsnz :)</p>
                    </div>
                </div>
            </Modal>

            {/* Supporter Success Modal */}
            <Modal
                isOpen={boughtSupporterPopup}
                onClose={() => setBoughtSupporterPopup(false)}
            >
                <div className="mt-[-130px] max-w-sm whitespace-pre-line rounded-xl border border-white bg-gray-700/50 px-6 py-4 text-sm text-white backdrop-blur-sm">
                    <img
                        className="mx-auto mb-2 block h-8 w-8 flex-shrink-0 sm:h-10 sm:w-10"
                        src="/svg/confetti.svg"
                        alt="Confetti"
                    />
                    <div className="mb-4 text-base font-semibold">
                        <p>Thank you for becoming a supporter!</p>
                    </div>

                    <div className="mb-6">
                        <p className="text-gray-300">
                            Your unlocks have been successfully added to your account. I hope you enjoy the
                            additional features!
                            <br />
                            <br />
                        </p>

                        <p>
                            If you have any questions or need further assistance, please don&apos;t hesitate
                            to reach out to me.
                        </p>
                        <br />
                        <p>- Carlos @sickshotsnz :)</p>
                    </div>
                </div>
            </Modal>
        </>
    )
}