
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Archivo_Black } from "next/font/google";
const archivoBlack = Archivo_Black({
    weight: "400", // Archivo Black only has 400
    subsets: ["latin"],
});
import LoadingPage from '@/components/LoadingPage';
import { useEffect, useState } from 'react'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { doc, getFirestore, updateDoc, onSnapshot, getDoc } from 'firebase/firestore'
import { useAuth } from '@/context/AuthContext';
import { notify } from '@/utils/notify';



// NOTE:
// next/font/google causes runtime crashes when used directly in client components
// in some Next.js configurations ("Cannot read properties of null (reading '_')").
// Font usage has been removed from this page and should be applied at the layout level instead.

// MOCKED USER STATE (replace with real data later)
// const user = {
//     posterCredits: 4,
//     aiCredits: 2,
//     carjamCredits: 0,
//     hasPackUnlocks: false,
//     supporter: {
//         isActive: false,
//         expiresAt: null, // Date | null
//     },
// }

export default function StorePage() {
    const router = useRouter()
    const auth = getAuth()
    const db = getFirestore()

    const [loading, setLoading] = useState(false)
    const { user } = useAuth()

    const [supporterCount, setSupporterCount] = useState<number>(0)

    type SupporterState = {
        isActive: boolean
        expiresAt: Date | null
    }

    const [credits, setCredits] = useState<{
        posterGen: number
        ai: number
        carJam: number
    }>({
        posterGen: 0,
        ai: 0,
        carJam: 0,
    })

    const [hasPackUnlocks, setHasPackUnlocks] = useState<boolean>(false)

    const searchParams = useSearchParams();
    const [boughtCreditsPopup, setBoughtCreditsPopup] = useState(false);
    const [boughtSupporterPopup, setBoughtSupporterPopup] = useState(false);

    const [dontShowAgainStorePopup, setDontShowAgainStorePopup] = useState(false);
    const [showStorePopup, setShowStorePopup] = useState(false);

    const [supporter, setSupporter] = useState<SupporterState>({
        isActive: false,
        expiresAt: null,
    })

    const hasUnlocks = Boolean(hasPackUnlocks)

    let isSupporter = false;
    if (supporter?.isActive && supporter.expiresAt) {
        let expiresAt: Date;

        // Type narrowing
        const expires = supporter.expiresAt as { seconds: number } | Date;

        if ('seconds' in expires) {
            // Firestore Timestamp
            expiresAt = new Date(expires.seconds * 1000);
        } else {
            // Already a Date
            expiresAt = expires as Date;
        }

        isSupporter = expiresAt > new Date();
    }

    //console.log('isSupporter', isSupporter);



    //console.log(supporter.expiresAt)

    const handleCloseStorePopup = async () => {
        setShowStorePopup(false);

        if (dontShowAgainStorePopup) {
            await updateDoc(doc(db, "users", user!.uid), {
                "settings.hideStorePopup": true,
            });
        }

    };

    useEffect(() => {
        setBoughtCreditsPopup(searchParams?.get('credits') === 'true');
        setBoughtSupporterPopup(searchParams?.get('supporter') === 'true');
    }, [searchParams]);

    const handleCloseBoughtCreditsPopup = async () => {
        setBoughtCreditsPopup(false);
    }

    const handleCloseBoughtSupporterPopup = async () => {
        setBoughtSupporterPopup(false);
    }



    useEffect(() => {
        const unsubAuth = onAuthStateChanged(auth, (authUser) => {
            if (!authUser) return

            const userRef = doc(db, 'users', authUser.uid)

            const unsubUser = onSnapshot(userRef, async (snap) => {
                if (!snap.exists()) return

                const data = snap.data()

                // ---- NORMALIZE DATA (READ) ----
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

                // ---- WRITE BACK ONLY IF MISSING ----
                const needsBackfill =
                    data.hasPackUnlocks === undefined || data.supporter === undefined

                if (needsBackfill) {
                    await updateDoc(userRef, {
                        hasPackUnlocks,
                        supporter,
                    })
                }

                // ---- SET LOCAL STATE ----
                setCredits(credits)
                setHasPackUnlocks(hasPackUnlocks)
                setSupporter(supporter)

                if (!data.settings?.hideStorePopup) {
                    setShowStorePopup(true)
                }
            })

            return unsubUser
        })

        return () => unsubAuth()
    }, [])


    useEffect(() => {
        const fetchCount = async () => {
            const ref = doc(db, 'app', 'supporterCount')
            const snap = await getDoc(ref)

            if (snap.exists()) {
                setSupporterCount(snap.data().value ?? 0)
            } else {
                setSupporterCount(0)
            }
        }

        fetchCount()
    }, [])

    const planTitle = isSupporter
        ? 'Supporter'
        : hasUnlocks
            ? 'Pro Account'
            : 'Free Plan'


    async function buyCreditPack(pack: 'small' | 'large') {
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
            body: JSON.stringify({ pack, isSupporter }),
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

    return (
        <>

            {loading && <LoadingPage text="Loading store..." />}



            <div className="max-w-6xl mx-auto px-3 pb-16 pt-6 space-y-10">
                {/* CURRENT PLAN */}
                <div className="p-[4px] rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500">
                    <div className="bg-white rounded-xl p-6">

                        <p className="text-sm sm:text-base md:text-lg text-gray-500 text-center mb-2">
                            Current plan:
                        </p>
                        <h1 className={`text-3xl sm:text-4xl md:text-5xl text-blue-400 text-center mb-2 ${archivoBlack.className}`}>
                            {planTitle}
                        </h1>

                        <div className="mt-6 text-sm space-y-1">
                            <p className="font-semibold text-gray-500 text-base">Templates</p>
                            <ul className="ml-5 text-gray-600">
                                {/*// TO-DO: add padlock svgs here */}
                                <li>Basic: Unlocked</li>
                                <li className="flex items-center gap-2">
                                    Pro:{" "}
                                    {hasUnlocks ? (
                                        <span>Unlocked</span>
                                    ) : (
                                        <>
                                            <img
                                                className="w-3 h-3"
                                                src="/svg/lock_icon.svg"
                                                alt="Locked"
                                            />
                                            <span>Locked</span>
                                        </>
                                    )}
                                </li>

                                <li className="flex items-center gap-2">
                                    Designer:{" "}
                                    {isSupporter ? (
                                        <span>Unlocked</span>
                                    ) : (
                                        <>
                                            <img
                                                className="w-3 h-3"
                                                src="/svg/lock_icon.svg"
                                                alt="Locked"
                                            />
                                            <span>
                                                {supporter.expiresAt
                                                    ? "Locked"
                                                    : "Locked"}
                                            </span>
                                        </>
                                    )}
                                </li>
                                {!isSupporter && supporter.expiresAt && (
                                    <p className="mb-2 mt-2 text-sm text-red-400">
                                        Supporter expired on {formatExpiry(supporter.expiresAt)}.
                                    </p>
                                )}

                            </ul>
                        </div>

                        <p className="font-semibold text-base text-gray-500 -mb-3 mt-3">Remaining Credits</p>
                        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                            <div className="rounded-lg border p-4 border-gray-400 flex flex-col gap-2">
                                <p className="font-semibold text-gray-500">Poster Credits</p>
                                <p className="text-gray-400 text-xs">Used to generate a poster.</p>

                                <div className="flex items-center gap-2">
                                    <img
                                        className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0"
                                        src="/svg/poster_credit_black.svg"
                                        alt="Poster Credits"
                                    />
                                    <p className="font-semibold text-gray-600">{credits.posterGen}</p>
                                </div>
                            </div>


                            <div className="rounded-lg border-1 p-4 border-gray-400 flex flex-col gap-2">
                                <p className="font-semibold text-gray-500">AI Credits</p>
                                <p className="text-gray-400 text-xs">Used to identify your vehicle using AI.</p>
                                <div className="flex items-center gap-2">
                                    <img
                                        className="w-6 h-6 sm:w-9 sm:h-9 flex-shrink-0"
                                        src="/svg/ai_credit_black.svg"
                                        alt="AI Credits"
                                    />
                                    <p className="font-semibold text-gray-600">{credits.ai}</p>
                                </div>
                            </div>
                            <div className="rounded-lg border-1 p-4 border-gray-400">
                                <p className="font-semibold text-gray-500" >Carjam Credits</p>
                                <p className="text-gray-400 text-xs">Used to identify your vehicle using CarJam.</p>
                                <div className="flex items-center gap-2 mt-2">
                                    <img
                                        className="w-6 h-6 sm:w-9 sm:h-9 flex-shrink-0"
                                        src="/svg/carjam_credit_black.svg"
                                        alt="Carjam Credits"
                                    />
                                    <p className="font-semibold text-gray-600">{credits.carJam}</p>
                                </div>
                            </div>
                        </div>

                        {isSupporter ? (
                            <>
                                <button
                                    onClick={async () => {
                                        notify("info", "Redirecting to payment portal...");
                                        const auth = getAuth()
                                        const user = auth.currentUser
                                        if (!user) return

                                        const token = await user.getIdToken()

                                        const res = await fetch('/api/checkout/portal', {
                                            method: 'POST',
                                            headers: {
                                                Authorization: `Bearer ${token}`,
                                            },
                                        })

                                        const data = await res.json()
                                        if (data.url) {
                                            window.location.href = data.url
                                        }
                                    }}
                                    className="mt-6 w-full max-w-[270px] rounded-xl py-2 text-sm font-semibold text-white
             bg-gradient-to-r from-cyan-500 to-blue-500 hover:brightness-110
             focus:outline-none focus:ring-2 focus:ring-cyan-300 shadow-md"
                                >
                                    Manage Subscription
                                </button>

                                {supporter.expiresAt ? (
                                    <p className="mb-2 text-sm text-green-600 mt-2 ml-2">
                                        Active until {formatExpiry(supporter.expiresAt)}
                                    </p>
                                ) : (
                                    <></>
                                )}

                            </>
                        ) : (
                            <></>
                        )
                        }
                    </div>
                </div>

                {/* CREDIT PACKS */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-blue-400 inline">Credit Packs</h2>
                    <p className="text-xs text-gray-400">Store currency: USD</p>

                    <p className="text-sm text-gray-500">
                        Credits stack and will never expire. Purchase of <b>any pack</b> (or becoming a supporter) unlocks additional features <b>for ever!</b>
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
                        {/* Pack 1 */}
                        <div className="relative border rounded-xl p-6 bg-gradient-to-b from-blue-100 to-blue-200 shadow-lg">
                            {/* Badge */}
                            {/* <div className="absolute -top-3 -right-3 px-3 py-1 text-xs font-semibold text-black bg-yellow-300 rounded-md shadow-[0_0_12px_rgba(253,224,71,0.9)]">
                                Most Popular
                            </div> */}

                            <h3 className="font-semibold text-blue-500">
                                {isSupporter ? (
                                    <>
                                        <span className="line-through mr-2">$12</span>
                                        $6 <span className="text-sm font-normal">(Enjoy half price, thank you for being a supporter!)</span>
                                    </>
                                ) : (
                                    "$12 Credit Pack"
                                )}
                            </h3>


                            <ul className="mt-4 space-y-2 text-sm text-gray-600 list-disc ml-5">
                                <li className="flex items-center gap-2 -ml-5 mt-4">
                                    <span>
                                        <b>
                                            You&apos;ll get:
                                        </b>
                                    </span>
                                </li>
                                <li className="flex items-center gap-2 -ml-5">
                                    <img
                                        className="w-6 h-6 sm:w-10 sm:h-10 flex-shrink-0"
                                        src="/svg/poster_credit_black.svg"
                                        alt="Poster Credits"
                                    />
                                    <span>+ 5 Poster Credits</span>
                                </li>
                                <li className="flex items-center gap-2 -ml-5">
                                    <img
                                        className="w-6 h-6 sm:w-9 sm:h-9 flex-shrink-0"
                                        src="/svg/ai_credit_black.svg"
                                        alt="AI Credits"
                                    />
                                    <span>+ 5 AI Credits</span>
                                </li>
                                <li className="flex items-center gap-2 -ml-5">
                                    <img
                                        className="w-6 h-6 sm:w-9 sm:h-9 flex-shrink-0"
                                        src="/svg/carjam_credit_black.svg"
                                        alt="Carjam Credits"
                                    />
                                    <span>+ 5 Carjam Credits</span>
                                </li>
                                <li className="flex items-center gap-2 -ml-5 mt-4">
                                    <span>
                                        <b>
                                            {hasPackUnlocks
                                                ? "Your account already has the following unlocks:"
                                                : "+ Unlock these features for your account, for ever:"}
                                        </b>
                                    </span>
                                </li>

                                <li className="flex items-center gap-2 -ml-5">
                                    <img
                                        className="w-6 h-6 sm:w-9 sm:h-9 flex-shrink-0"
                                        src="/svg/checkmark.svg"
                                        alt="Tick"
                                    />
                                    <span>High-quality downloads (framed + unframed)</span>
                                </li>
                                <li className="flex items-center gap-2 -ml-5">
                                    <img
                                        className="w-6 h-6 sm:w-9 sm:h-9 flex-shrink-0"
                                        src="/svg/checkmark.svg"
                                        alt="Tick"
                                    />
                                    <span>All Basic + Pro templates unlocked</span>
                                </li>
                                <li className="flex items-center gap-2 -ml-5">
                                    <img
                                        className="w-6 h-6 sm:w-9 sm:h-9 flex-shrink-0"
                                        src="/svg/checkmark.svg"
                                        alt="Tick"
                                    />
                                    <span>Showcase page customisation unlocked</span>
                                </li>


                            </ul>


                            <button
                                className="mt-6 w-full max-w-[270px] rounded-xl py-2 text-sm font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-500 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                                onClick={() => buyCreditPack('small')}
                            >
                                Buy Pack
                            </button>
                        </div>


                        {/* Pack 2 */}
                        <div className="relative border rounded-xl p-6 bg-gradient-to-b from-blue-100 to-blue-200 shadow-lg">
                            {/* Badge */}
                            <div className="absolute -top-3 -right-3 px-3 py-1 text-xs font-semibold text-black bg-yellow-300 rounded-md shadow-[0_0_12px_rgba(253,224,71,0.9)]">
                                Most Popular
                            </div>

                            <h3 className="font-semibold text-blue-500">
                                <span className="mr-2 text-sm text-gray-400 line-through">$21</span>
                                {isSupporter ? (
                                    <>
                                        <span className="line-through mr-2">$17</span>
                                        $8 <span className="text-sm font-normal">(Enjoy half price, thank you for being a supporter!)</span>
                                    </>
                                ) : (
                                    "$17 Credit Pack"
                                )}
                            </h3>

                            <ul className="mt-4 space-y-2 text-sm text-gray-600 list-disc ml-5">
                                <li className="flex items-center gap-2 -ml-5 mt-4">
                                    <span>
                                        <b>
                                            You&apos;ll get:
                                        </b>
                                    </span>
                                </li>
                                <li className="flex items-center gap-2 -ml-5">
                                    <img
                                        className="w-6 h-6 sm:w-10 sm:h-10 flex-shrink-0"
                                        src="/svg/poster_credit_black.svg"
                                        alt="Poster Credits"
                                    />
                                    <span>+ 10 Poster Credits</span>
                                </li>
                                <li className="flex items-center gap-2 -ml-5">
                                    <img
                                        className="w-6 h-6 sm:w-9 sm:h-9 flex-shrink-0"
                                        src="/svg/ai_credit_black.svg"
                                        alt="AI Credits"
                                    />
                                    <span>+ 10 AI Credits</span>
                                </li>
                                <li className="flex items-center gap-2 -ml-5">
                                    <img
                                        className="w-6 h-6 sm:w-9 sm:h-9 flex-shrink-0"
                                        src="/svg/carjam_credit_black.svg"
                                        alt="Carjam Credits"
                                    />
                                    <span>+ 10 Carjam Credits</span>
                                </li>
                                <li className="flex items-center gap-2 -ml-5 mt-4">
                                    <span>
                                        <b>
                                            {hasPackUnlocks
                                                ? "Your account already has the following unlocks:"
                                                : "+ Unlock these features for your account, for ever:"}
                                        </b>
                                    </span>
                                </li>

                                <li className="flex items-center gap-2 -ml-5">
                                    <img
                                        className="w-6 h-6 sm:w-9 sm:h-9 flex-shrink-0"
                                        src="/svg/checkmark.svg"
                                        alt="Tick"
                                    />
                                    <span>High-quality downloads (framed + unframed)</span>
                                </li>
                                <li className="flex items-center gap-2 -ml-5">
                                    <img
                                        className="w-6 h-6 sm:w-9 sm:h-9 flex-shrink-0"
                                        src="/svg/checkmark.svg"
                                        alt="Tick"
                                    />
                                    <span>All Basic + Pro templates unlocked</span>
                                </li>
                                <li className="flex items-center gap-2 -ml-5">
                                    <img
                                        className="w-6 h-6 sm:w-9 sm:h-9 flex-shrink-0"
                                        src="/svg/checkmark.svg"
                                        alt="Tick"
                                    />
                                    <span>Showcase page customisation unlocked</span>
                                </li>
                            </ul>

                            <button
                                className="mt-6 w-full max-w-[270px] rounded-xl py-2 text-sm font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-500 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                                onClick={() => buyCreditPack('large')}
                            >
                                Buy Pack
                            </button>
                        </div>

                    </div>
                </section>

                {/* SUPPORTER */}
                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-blue-400">Supporter Package</h2>

                    <div
                        className="relative overflow-hidden rounded-2xl p-6
    shadow-[0_12px_45px_rgba(0,120,255,0.16)]
    bg-gradient-to-br from-sky-100 via-blue-200 to-amber-200
    animate-gradient-orbit border-amber-400 border-3"
                    >
                        {/* Value tag */}
                        <div className="absolute top-4
                left-4 right-4
                sm:left-auto sm:right-4
                inline-flex w-fit max-w-[90vw]
                px-3 py-1
                text-xs font-semibold text-white
                bg-purple-600 rounded-full shadow-md
                break-words text-center">
                            Best value for active photographers
                        </div>


                        <div className="block md:hidden h-4"></div>


                        {isSupporter && supporter.expiresAt && (
                            <p className="mb-2 text-sm text-green-600 mt-2">
                                Active until {formatExpiry(supporter?.expiresAt)}
                            </p>
                        )}

                        <div className="mt-6">
                            <p className="text-lg font-semibold text-blue-500">$9 / month</p>
                            <p className="text-xs text-gray-400">Minimum 3 months.</p>
                        </div>


                        <ul className="mt-4 space-y-2 text-sm text-gray-600 ml-5">
                            <li className="flex items-center gap-2 -ml-5 mt-4">
                                <span>
                                    <b>
                                        You&apos;ll get:
                                    </b>
                                </span>
                            </li>
                            <li className="flex items-center gap-2 -ml-5">
                                <img
                                    className="w-6 h-6 sm:w-10 sm:h-10 flex-shrink-0"
                                    src="/svg/poster_credit_black.svg"
                                    alt="Poster Credits"
                                />
                                <span>+ 10 Poster Credits / month</span>
                            </li>
                            <li className="flex items-center gap-2 -ml-5">
                                <img
                                    className="w-6 h-6 sm:w-9 sm:h-9 flex-shrink-0"
                                    src="/svg/ai_credit_black.svg"
                                    alt="AI Credits"
                                />
                                <span>+ 10 AI Credits / month</span>
                            </li>
                            <li className="flex items-center gap-2 -ml-5">
                                <img
                                    className="w-6 h-6 sm:w-9 sm:h-9 flex-shrink-0"
                                    src="/svg/carjam_credit_black.svg"
                                    alt="Carjam Credits"
                                />
                                <span>+ 10 Carjam Credits / month</span>
                            </li>
                            <li className="flex items-center gap-2 -ml-5">
                                <img
                                    className="w-6 h-6 sm:w-9 sm:h-9 flex-shrink-0"
                                    src="/svg/checkmark.svg"
                                    alt="Tick"
                                />
                                <span><b>All</b> credit pack features unlocked</span>
                            </li>
                            <li className="flex items-center gap-2 -ml-5">
                                <img
                                    className="w-6 h-6 sm:w-9 sm:h-9 flex-shrink-0"
                                    src="/svg/checkmark.svg"
                                    alt="Tick"
                                />
                                <span>All <b>Designer</b> templates unlocked</span>
                            </li>
                            <li className="flex items-center gap-2 -ml-5">
                                <img
                                    className="w-6 h-6 sm:w-9 sm:h-9 flex-shrink-0"
                                    src="/svg/checkmark.svg"
                                    alt="Tick"
                                />
                                <span>All future templates unlocked (new designs fortnightly!)</span>
                            </li>
                            <li><b>Bonus:</b> -50% off all credit packs</li>
                        </ul>

                        <button
                            disabled={isSupporter}
                            className="mt-6
        w-full max-w-[270px] rounded-xl py-2 text-sm font-semibold text-white
        bg-gradient-to-r from-cyan-500 to-blue-500
        hover:brightness-110
        focus:outline-none focus:ring-2 focus:ring-cyan-300
        disabled:opacity-50 disabled:cursor-not-allowed
        shadow-md"
                            onClick={handleSupporterBtnClick}
                        >
                            {isSupporter ? 'Supporter Active' : 'Become a Supporter'}
                        </button>
                        <p className="text-gray-400 text-xs mt-1 text-left ml-1">Current app supporters: {supporterCount}</p>
                    </div>

                </section>

                <button
                    onClick={() => router.replace('/account/dashboard')}
                    className="mb-4 mt-4 w-full max-w-[140px] rounded-xl py-2 text-sm font-semibold
                bg-white text-gray-800 shadow-md
                border border-gray-200
                hover:bg-gray-50
                disabled:opacity-50"
                >
                    Back
                </button>
            </div >

            {showStorePopup && (
                <div
                    className="fixed inset-0 z-50"
                    onClick={handleCloseStorePopup}
                >
                    {/* Dark overlay */}
                    <div className="absolute inset-0 bg-black/70" />

                    {/* Text */}
                    <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
                        <div
                            className="bg-gray-700/50 backdrop-blur-sm border border-white rounded-xl px-6 py-4 max-w-sm text-white text-sm whitespace-pre-line mt-[-170px]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="text-base font-semibold mb-4">
                                <p>Welcome to the store!</p>
                            </div>

                            <div className="mb-6">
                                <p className='text-gray-300'>Here you can see your remaining credits, see unlockable features and buy a pack!<br /><br /></p>

                                <p>This app is built and maintained by a single human, so your support has a very real impact on how it can grow and improve. So thank you!</p><br />

                                <p className='text-gray-300'>If you have any questions, please don&apos;t hesitate to reach out:</p><br />
                                <p className='text-gray-300'>- Carlos @sickshotsnz</p>
                            </div>


                            <label className="flex items-center gap-2 text-xs opacity-90 cursor-pointer text-gray-400">
                                <input
                                    type="checkbox"
                                    checked={dontShowAgainStorePopup}
                                    onChange={(e) => setDontShowAgainStorePopup(e.target.checked)}
                                    className="accent-cyan-400"
                                />
                                <span>Don&apos;t show this again</span>
                            </label>
                        </div>
                    </div>
                </div>
            )}
            {boughtCreditsPopup && (
                <div
                    className="fixed inset-0 z-50"
                    onClick={handleCloseBoughtCreditsPopup}
                >
                    {/* Dark overlay */}
                    <div className="absolute inset-0 bg-black/70" />

                    {/* Text */}
                    <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
                        <div
                            className="bg-gray-700/50 backdrop-blur-sm border border-white rounded-xl px-6 py-4 max-w-sm text-white text-sm whitespace-pre-line mt-[-170px]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="text-base font-semibold mb-4">
                                <p>Thank you for your purchase!</p>
                            </div>

                            <div className="mb-6">
                                <p className='text-gray-300'>Your pack has been successfully added to your account. I hope you enjoy the additional features!<br /><br /></p>

                                <p>If you have any questions or need further assistance, please don&apos;t hesitate to reach out to me.</p><br />
                                <p>- Carlos @sickshotsnz :)</p>

                            </div>
                        </div>
                    </div>
                </div>
            )}
            {boughtSupporterPopup && (
                <div
                    className="fixed inset-0 z-50"
                    onClick={handleCloseBoughtSupporterPopup}
                >
                    {/* Dark overlay */}
                    <div className="absolute inset-0 bg-black/70" />

                    {/* Text */}
                    <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
                        <div
                            className="bg-gray-700/50 backdrop-blur-sm border border-white rounded-xl px-6 py-4 max-w-sm text-white text-sm whitespace-pre-line mt-[-170px]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="text-base font-semibold mb-4">
                                <p>Thank you for becoming a supporter!</p>
                            </div>

                            <div className="mb-6">
                                <p className='text-gray-300'>Your unlocks have been successfully added to your account. I hope you enjoy the additional features!<br /><br /></p>

                                <p>If you have any questions or need further assistance, please don&apos;t hesitate to reach out to me.</p><br />
                                <p>- Carlos @sickshotsnz :)</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
