// src/app/account/posters/page.tsx
/* eslint-disable @next/next/no-img-element */

'use client'

import { useEffect, useState } from 'react'
import { getAuth } from 'firebase/auth'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from '@/firebase/client'
import { Timestamp } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import LoadingPage from '@/components/LoadingPage'
import { useRouter } from 'next/navigation'

type Poster = {
    id: string;
    posterUrl: string
    createdAt: Timestamp
    templateId: string
    carDetails: {
        year: string
        make: string
        model: string
    }
    thumbnailUrl: string
}

const handleDownload = async (poster: Poster) => {
    try {
        const url = poster.posterUrl
        const response = await fetch(url, { mode: 'cors' });
        if (!response.ok) throw new Error('Network response was not ok');

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `Poster_${poster.carDetails.make}_${poster.carDetails.model}.png`;
        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(blobUrl); // clean up
    } catch (error) {
        console.error('Download failed:', error);
    }
};

export default function PosterHistoryPage() {
    const [posters, setPosters] = useState<Poster[]>([])
    const [loading, setLoading] = useState(true)
    const [uid, setUid] = useState<string | null>(null)

    const router = useRouter()

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(getAuth(), async (user) => {
            if (!user) {
                setLoading(false)
                return
            }

            const postersRef = collection(db, 'users', user.uid, 'posters')
            const q = query(postersRef, orderBy('createdAt', 'desc'))
            const snapshot = await getDocs(q)

            const data = snapshot.docs.map((doc): Poster => ({
                id: doc.id,
                ...(doc.data() as Omit<Poster, 'id'>)
            }));
            setUid(user.uid)
            setPosters(data)
            setLoading(false)
        })

        return () => unsubscribe()
    }, [])

    return (
        <div className="p-2">
            <h1 className="text-2xl font-bold mb-4">My Posters</h1>
            {loading ? (
                <LoadingPage text="Loading posters..." />
            ) : posters.length === 0 ? (
                <p>No posters found. Go generate one!</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:px-6 lg:px-12 p-2">

                    {posters.map((poster, index) => (
                        <div
                            key={index}
                            className="flex flex-col rounded-xl p-[4px] bg-gradient-to-br from-cyan-700 to-blue-800 shadow-md hover:shadow-lg transition-shadow duration-300"

                        >
                            <img
                                src={poster.thumbnailUrl || poster.posterUrl}
                                alt="Poster"
                                className="rounded-md mb-3 object-contain w-full h-48 sm:h-56 md:h-64 bg-gray-800"
                            />

                            <div className="flex-1 mx-2">
                                <p className="text-xs sm:text-sm italic text-gray-300">
                                    {poster.carDetails?.year} {poster.carDetails?.make}{" "}
                                    {poster.carDetails?.model}
                                </p>
                                <p className="text-xs sm:text-sm font-medium mb-1 text-gray-300">
                                    Template: {poster.templateId}
                                </p>
                                <p className="text-xs sm:text-sm text-gray-300 mb-1">
                                    Created: {poster.createdAt.toDate().toLocaleDateString()}
                                </p>
                            </div>

                            {/* Buttons */}
                            <div className="mt-3 flex flex-wrap gap-2 m-2">
                                {/* Showcase */}
                                <a
                                    href={`/mockup?uid=${encodeURIComponent(uid!)}&posterId=${encodeURIComponent(
                                        poster.id
                                    )}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 text-center text-xs sm:text-sm px-3 py-2 rounded bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-colors"
                                >
                                    Showcase
                                </a>

                                {/* Download */}
                                <button
                                    onClick={() => handleDownload(poster)}
                                    className="flex-1 text-center text-xs sm:text-sm px-3 py-2 rounded bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 transition-colors"
                                >
                                    Download
                                </button>

                                {/* Share */}
                                <button
                                    onClick={async () => {
                                        if (navigator.share) {
                                            try {
                                                await navigator.share({
                                                    title: "Check out my car poster!",
                                                    url: `/mockup?uid=${encodeURIComponent(
                                                        uid!
                                                    )}&posterId=${encodeURIComponent(poster.id)}`,
                                                });
                                            } catch (err) {
                                                console.error("Share failed:", err);
                                            }
                                        } else {
                                            await navigator.clipboard.writeText(
                                                `/mockup?uid=${encodeURIComponent(
                                                    uid!
                                                )}&posterId=${encodeURIComponent(poster.id)}`
                                            );
                                            alert("Link copied to clipboard!");
                                        }
                                    }}
                                    className="flex-1 text-center text-xs sm:text-sm px-3 py-2 rounded bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 transition-colors"
                                >
                                    Share
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

            )}
            <button  onClick={() => {
                    router.replace('/account/dashboard');
                }} className="self-start mt-6 relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-pink-500 to-orange-400 group-hover:from-pink-500 group-hover:to-orange-400 hover:text-white dark:text-white focus:ring-4 focus:outline-none focus:ring-pink-200 dark:focus:ring-pink-800">
                <span className="relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-transparent group-hover:dark:bg-transparent">
                    Back
                </span>
            </button>

        </div>
    )
}
