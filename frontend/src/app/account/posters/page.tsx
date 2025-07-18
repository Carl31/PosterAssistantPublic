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
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">My Posters</h1>
            {loading ? (
                <LoadingPage text="Loading posters..." />
            ) : posters.length === 0 ? (
                <p>No posters found. Go generate one!</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {posters.map((poster, index) => (
                        <div key={index} className="border rounded-xl p-3 shadow-md bg-white">
                            <img src={poster.posterUrl} alt="Poster" className="rounded-md mb-2" />
                            <p className="text-sm text-gray-600">Created: {poster.createdAt.toDate().toLocaleDateString()}</p>
                            <p className="text-sm font-medium">Template: {poster.templateId}</p>
                            <p className="text-sm italic text-gray-700">
                                {poster.carDetails?.year} {poster.carDetails?.make} {poster.carDetails?.model}
                            </p>

                            {/* ✅ Add download link */}
                            {/* <a
                                href={poster.imageUrl}
                                download
                                className="mt-2 inline-block text-blue-600 underline text-sm"
                            >
                                Download Poster
                            </a> */}
                            <div className="mt-2 flex gap-2">
                                {/* View button */}
                                {/* href={`/mockup?uid=${encodeURIComponent(uid)}&posterId=${encodeURIComponent(poster.id)}`} */}
                                <a
                                    href={`/mockup?uid=${encodeURIComponent(uid!)}&posterId=${encodeURIComponent(poster.id)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm px-3 py-1 rounded bg-blue-500 text-white hover:bg-blue-600"
                                >
                                    Showcase
                                </a>

                                {/* Download button */}
                                <button
                                    onClick={() => handleDownload(poster)}
                                    className="text-sm px-3 py-1 rounded bg-green-500 text-white hover:bg-green-600"
                                >
                                    Download
                                </button>

                                {/* Share button */}
                                <button
                                    onClick={async () => {
                                        if (navigator.share) {
                                            try {
                                                await navigator.share({
                                                    title: "Check out my car poster!",
                                                    url: `/mockup?uid=${encodeURIComponent(uid!)}&posterId=${encodeURIComponent(poster.id)}`,
                                                });
                                            } catch (err) {
                                                console.error("Share failed:", err);
                                            }
                                        } else {
                                            await navigator.clipboard.writeText(`/mockup?uid=${encodeURIComponent(uid!)}&posterId=${encodeURIComponent(poster.id)}`);
                                            alert("Link copied to clipboard!");
                                        }
                                    }}
                                    className="text-sm px-3 py-1 rounded bg-purple-500 text-white hover:bg-purple-600"
                                >
                                    Share
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <button
                onClick={() => {
                    router.replace('/account/dashboard');
                }}
                className="mt-6 bg-blue-600 text-white px-4 py-2 rounded-md"
            >
                Back
            </button>

        </div>
    )
}
