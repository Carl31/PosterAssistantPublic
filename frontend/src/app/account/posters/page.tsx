
// src/app/account/posters/page.tsx
/* eslint-disable @next/next/no-img-element */

'use client'

import { useEffect, useState } from 'react'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { collection, deleteDoc, getDocs, orderBy, query, doc, Timestamp } from 'firebase/firestore'
import { deleteObject, ref } from 'firebase/storage'
import { db, storage } from '@/firebase/client'
import LoadingPage from '@/components/LoadingPage'
import { useRouter, useSearchParams } from 'next/navigation'
import { notify } from '@/utils/notify'

type Poster = {
    id: string
    posterUrl: string
    thumbnailUrl: string
    createdAt: Timestamp
    templateId: string
    carDetails: {
        year: string
        make: string
        model: string
    }
}

const handleDownload = async (poster: Poster) => {
    const response = await fetch(poster.posterUrl)
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `Poster_${poster.carDetails.make}_${poster.carDetails.model}.png`
    a.click()

    URL.revokeObjectURL(url)
}

export default function PosterHistoryPage() {
    const [posters, setPosters] = useState<Poster[]>([])
    const [loading, setLoading] = useState(true)
    const [uid, setUid] = useState<string | null>(null)
    const [activePoster, setActivePoster] = useState<Poster | null>(null)
    const [showDeletePopup, setShowDeletePopup] = useState(false)
    const [posterToDelete, setPosterToDelete] = useState<Poster | null>(null)
    const [deleteLocked, setDeleteLocked] = useState(false)
    const [showDownloadPopup, setShowDownloadPopup] = useState(false)
    const [posterToDownload, setPosterToDownload] = useState<Poster | null>(null)




    const router = useRouter()
    const searchParams = useSearchParams()
    const showReloadFlag = searchParams!.get('fromLoading') === 'true'

    type Template = {
        id: string
        name: string
    }

    const [templateMap, setTemplateMap] = useState<Record<string, string>>({})

    function useCooldown(durationMs: number) {
        const [locked, setLocked] = useState(false)

        const run = async (fn: () => Promise<void> | void) => {
            if (locked) return
            setLocked(true)

            try {
                await fn()
            } finally {
                setTimeout(() => setLocked(false), durationMs)
            }
        }

        return { locked, run }
    }

    const downloadCooldown = useCooldown(1000)



    useEffect(() => {
        const unsubscribe = onAuthStateChanged(getAuth(), async (user) => {
            if (!user) {
                setLoading(false)
                return
            }

            const q = query(
                collection(db, 'users', user.uid, 'posters'),
                orderBy('createdAt', 'desc')
            )

            const snapshot = await getDocs(q)
            const data = snapshot.docs.map((d) => ({
                id: d.id,
                ...(d.data() as Omit<Poster, 'id'>),
            }))

            setUid(user.uid)
            setPosters(data)
            setLoading(false)
        })

        return () => unsubscribe()
    }, [])

    useEffect(() => {
        const fetchTemplates = async () => {
            const snapshot = await getDocs(collection(db, 'templates'))

            const map: Record<string, string> = {}
            snapshot.docs.forEach((d) => {
                map[d.id] = d.data().name
            })

            setTemplateMap(map)
        }

        fetchTemplates()
    }, [])


    const handleDelete = async (poster: Poster) => {
        if (!uid) return

        await deleteDoc(doc(db, 'users', uid, 'posters', poster.id))

        await Promise.allSettled([
            deleteObject(ref(storage, `user_posters/${uid}/${poster.id}.png`)),
            deleteObject(ref(storage, `user_posters/${uid}/${poster.id}_thumb.png`)),
        ])

        setPosters((p) => p.filter((x) => x.id !== poster.id))
    }

    const handleConfirmDelete = async () => {
        if (!posterToDelete || deleteLocked) return

        setDeleteLocked(true)

        try {
            await handleDelete(posterToDelete)
        } finally {
            setPosterToDelete(null)
            setShowDeletePopup(false)

            setTimeout(() => {
                setDeleteLocked(false)
            }, 1000)
        }
    }

    const downloadFramed = async (poster: Poster) => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const frameImg = new Image()
        const posterImg = new Image()

        frameImg.crossOrigin = 'anonymous'
        posterImg.crossOrigin = 'anonymous'

        canvas.width = 1149
        canvas.height = 1920

        frameImg.src = '/mockup_frame_light.png'
        posterImg.src = poster.posterUrl

        await Promise.all([
            new Promise<void>((res) => (frameImg.onload = () => res())),
            new Promise<void>((res) => (posterImg.onload = () => res())),
        ])

        // Draw frame
        ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height)

        // PERFECT placement (from your working mockup)
        const scale = 1.298
        const x = 132
        const y = 342
        const width = 680 * scale
        const height = 960 * scale

        ctx.drawImage(posterImg, x, y, width, height)

        const blob = await new Promise<Blob>((resolve) =>
            canvas.toBlob((b) => resolve(b!), 'image/png')
        )

        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `Poster_${poster.carDetails.make}_${poster.carDetails.model}_Framed.png`
        a.click()
        URL.revokeObjectURL(url)
    }


    const loadImage = (src: string) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => resolve(img)
            img.onerror = reject
            img.src = src
        })

    const downloadUnframed = async (poster: Poster) => {
        const response = await fetch(poster.posterUrl)
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)

        const a = document.createElement('a')
        a.href = url
        a.download = `Poster_${poster.carDetails.make}_${poster.carDetails.model}.png`
        a.click()

        URL.revokeObjectURL(url)
    }





    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4 text-black">My Posters</h1>

            {showReloadFlag && (
                <p className="text-sm text-gray-700 mb-2">
                    Reload to see newly generated posters
                </p>
            )}

            {loading ? (
                <LoadingPage text="Loading posters..." />
            ) : posters.length === 0 ? (
                <p className='text-black'>No posters found. Go make one!</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {posters.map((poster) => {
                        const isActive = activePoster?.id === poster.id;

                        return (
                            <div key={poster.id} className="flex flex-col items-center">
                                {/* Poster with border/shadow */}
                                <div
                                    onClick={() => setActivePoster(isActive ? null : poster)}
                                    className="inline-block bg-black p-[4px] shadow-[-6px_6px_16px_rgba(0,0,0,0.45)] cursor-pointer"
                                >
                                    <img
                                        src={poster.thumbnailUrl || poster.posterUrl}
                                        alt="Poster"
                                        className="block max-w-full h-auto bg-white"
                                    />
                                </div>

                                {/* metadata */}
                                <div className="mt-4 ml-2 text-xs text-gray-700 w-full text-left">
                                    <div>
                                        {poster.carDetails.year} {poster.carDetails.make} {poster.carDetails.model}
                                    </div>
                                    <div> <b>Template:</b> {templateMap[poster.templateId] ?? poster.templateId}</div>
                                    <div>
                                        <b>Created:</b> {poster.createdAt.toDate().toLocaleDateString('en-GB')}
                                    </div>
                                </div>

                                {/* Expandable buttons with smooth animation */}
                                <div
                                    className={`mt-2 flex flex-col gap-2 overflow-hidden transition-all duration-300 ease-in-out w-full`}
                                    style={{ maxHeight: isActive ? '500px' : '0' }}
                                >
                                    <button
                                        onClick={() =>
                                            window.open(`/mockup?uid=${uid}&posterId=${poster.id}`, "_blank")
                                        }
                                        className="py-2 rounded bg-gray-900 text-white text-sm w-full"
                                    >
                                        Showcase
                                    </button>

                                    <button
                                        onClick={() => {
                                            setPosterToDownload(poster)
                                            setShowDownloadPopup(true)
                                        }}
                                        className="py-1.5 w-full rounded-sm bg-white border-2 border-blur-500 text-blue-500 text-sm"
                                    >
                                        Download
                                    </button>

                                    <button
                                        onClick={async () => {
                                            const url = `/mockup?uid=${uid}&posterId=${poster.id}`;
                                            if (navigator.share) await navigator.share({ url });
                                            else await navigator.clipboard.writeText(url);
                                        }}
                                        className="py-1.5 w-full rounded-sm bg-white border-2 border-purple-500 text-purple-500 text-sm"
                                    >
                                        Share
                                    </button>

                                    <button
                                        onClick={() => {
                                            setPosterToDelete(poster)
                                            setShowDeletePopup(true)
                                        }}
                                        className="py-1.5 w-full rounded-sm bg-white border-2 border-red-500 text-red-500 text-sm"
                                    >
                                        Delete
                                    </button>

                                </div>

                                {showDownloadPopup && posterToDownload && (
                                    <div className="fixed inset-0 flex items-center justify-center backdrop-blur-sm z-50 p-4">
                                        <div className="bg-white rounded-xl p-5 w-full max-w-xl shadow-lg">
                                            <h2 className="text-base font-semibold text-blue-400 mb-5 text-center">
                                                Download Poster
                                            </h2>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                                                {/* Unframed */}
                                                <div className="rounded-lg border border-gray-200 p-4 flex flex-col justify-between">
                                                    <div className="mb-3">
                                                        <h3 className="text-sm font-medium text-gray-700">
                                                            Unframed
                                                        </h3>
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            Original poster file
                                                        </p>
                                                    </div>

                                                    <button
                                                        onClick={async () => {
                                                            setShowDownloadPopup(false)
                                                            notify('info', 'Downloading...')
                                                            downloadCooldown.run(() =>
                                                               downloadUnframed(posterToDownload)
                                                            )
                                                        }}
                                                        className="mt-auto px-3 py-1.5 text-sm border rounded-md border-gray-300 text-gray-800 hover:bg-gray-50"
                                                    >
                                                        Download
                                                    </button>
                                                </div>

                                                {/* Framed (Primary) */}
                                                <div className="rounded-lg border border-gray-900 bg-gray-900 p-4 flex flex-col justify-between shadow-md ">
                                                    <div className="text-center">
                                                        <h3 className="text-sm font-semibold text-white">
                                                            Framed
                                                        </h3>
                                                        <p className="text-xs text-gray-300 mt-1">
                                                            Presentation-ready mockup
                                                        </p>
                                                    </div>

                                                    <img
                                                        src="/svg/frame-white.svg"
                                                        className="max-h-12 object-contain mx-auto my-5"
                                                    />

                                                    <button
                                                        onClick={async () => {
                                                            setShowDownloadPopup(false)
                                                            notify('info', 'Downloading...')
                                                            downloadCooldown.run(() =>
                                                               downloadFramed(posterToDownload)
                                                            )
                                                        }}
                                                        className="px-5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm"
                                                    >
                                                        Download
                                                    </button>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => {
                                                    setShowDownloadPopup(false)
                                                    setPosterToDownload(null)
                                                }}
                                                className="w-full px-3 py-1.5 text-sm rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>

                                )}


                            </div>

                        );
                    })}

                </div>
            )}


            <button
                onClick={() => router.replace('/account/dashboard')}
                className="bottom-4 left-1/2 mt-4 transform px-5 py-2 rounded-lg   bg-white text-gray-800 shadow-md
                border border-gray-200
                hover:bg-gray-50
                disabled:opacity-50"
            >
                Back
            </button>

            {showDeletePopup && (
                <div className="fixed inset-0 flex items-center justify-center backdrop-blur-sm z-50">
                    <div className="p-4 rounded-lg bg-gray-100 text-center">
                        <p className="mb-4 text-gray-800">
                            Are you sure you want to delete this poster?
                        </p>
                        <div className="flex gap-2 justify-center">
                            <button
                                onClick={handleConfirmDelete}
                                className="px-4 py-2 bg-red-600 text-white rounded"
                            >
                                Delete
                            </button>
                            <button
                                onClick={() => {
                                    setShowDeletePopup(false)
                                    setPosterToDelete(null)
                                }}
                                className="px-4 py-2 bg-gray-300 rounded"
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



// // src/app/account/posters/page.tsx
// /* eslint-disable @next/next/no-img-element */

// 'use client'

// import { useEffect, useState } from 'react'
// import { getAuth } from 'firebase/auth'
// import { collection, deleteDoc, getDocs, orderBy, query, doc } from 'firebase/firestore'
// import { db, storage } from '@/firebase/client'
// import { Timestamp } from 'firebase/firestore'
// import { onAuthStateChanged } from 'firebase/auth'
// import LoadingPage from '@/components/LoadingPage'
// import { useRouter, useSearchParams } from 'next/navigation'
// import { deleteObject, ref } from 'firebase/storage'

// type Poster = {
//     id: string;
//     posterUrl: string
//     createdAt: Timestamp
//     templateId: string
//     carDetails: {
//         year: string
//         make: string
//         model: string
//     }
//     thumbnailUrl: string
// }

// const handleDownload = async (poster: Poster) => {
//     try {
//         const url = poster.posterUrl
//         const response = await fetch(url, { mode: 'cors' });
//         if (!response.ok) throw new Error('Network response was not ok');

//         const blob = await response.blob();
//         const blobUrl = URL.createObjectURL(blob);

//         const link = document.createElement('a');
//         link.href = blobUrl;
//         link.download = `Poster_${poster.carDetails.make}_${poster.carDetails.model}.png`;
//         document.body.appendChild(link);
//         link.click();
//         link.remove();

//         URL.revokeObjectURL(blobUrl); // clean up
//     } catch (error) {
//         console.error('Download failed:', error);
//     }
// };

// export default function PosterHistoryPage() {
//     const [posters, setPosters] = useState<Poster[]>([])
//     const [loading, setLoading] = useState(true)
//     const [uid, setUid] = useState<string | null>(null)
//     const [selectedPoster, setSelectedPoster] = useState<null | typeof posters[0]>(null);


//     const router = useRouter()

//     const searchParams = useSearchParams();
//     const showReloadFlag = searchParams!.get('fromLoading') === 'true';

//     useEffect(() => {
//         // Removes the "fromLoading" param from the URL when the page is reloaded
//         const [nav] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
//         if (nav?.type === "reload") {
//             const url = new URL(window.location.href);
//             // ✅ Remove "fromLoading" param
//             url.searchParams.delete("fromLoading");
//             // ✅ Update URL without reloading again
//             window.history.replaceState({}, "", url.toString());
//         }

//         const unsubscribe = onAuthStateChanged(getAuth(), async (user) => {
//             if (!user) {
//                 setLoading(false)
//                 return
//             }

//             const postersRef = collection(db, 'users', user.uid, 'posters')
//             const q = query(postersRef, orderBy('createdAt', 'desc'))
//             const snapshot = await getDocs(q)

//             const data = snapshot.docs.map((doc): Poster => ({
//                 id: doc.id,
//                 ...(doc.data() as Omit<Poster, 'id'>)
//             }));
//             setUid(user.uid)
//             setPosters(data)
//             setLoading(false)
//         })

//         return () => unsubscribe()
//     }, [])

//     // const handleDelete = async (poster: Poster) => {
//     //     try {
//     //         const posterRef = doc(db, 'users', uid!, 'posters', poster.id)
//     //         await deleteDoc(posterRef)
//     //         window.location.reload();
//     //     } catch (error) {
//     //         console.error('Delete failed:', error);
//     //     }
//     // };

//     const handleDelete = async (poster: Poster) => {
//         if (!uid) {
//             console.error("Delete failed: uid is null");
//             return;
//         }

//         try {
//             // Delete Firestore document
//             const posterRef = doc(db, "users", uid, "posters", poster.id);
//             await deleteDoc(posterRef);

//             // Delete poster images from Storage
//             const posterImageRef = ref(storage, `user_posters/${uid}/${poster.id}.png`);
//             const posterThumbRef = ref(storage, `user_posters/${uid}/${poster.id}_thumb.png`);

//             await Promise.all([
//                 deleteObject(posterImageRef).catch((err) =>
//                     console.warn("Main image delete failed:", err)
//                 ),
//                 deleteObject(posterThumbRef).catch((err) =>
//                     console.warn("Thumbnail delete failed:", err)
//                 ),
//             ]);

//             console.log("Poster and related files deleted successfully");
//             //window.location.reload();
//             setPosters((prev) => prev.filter((p) => p.id !== selectedPoster!.id));
//         } catch (error) {
//             console.error("Delete failed:", error);
//         }
//     };

//     return (
//         <div className="p-2">
//             <h1 className="text-2xl font-bold mb-4 text-black">My Posters</h1>
//             {showReloadFlag && (
//                 <p className='text-sm text-gray-700 mb-2'>**Please reload the page to see newly-generated poster**</p>
//             )}

//             {loading ? (
//                 <LoadingPage text="Loading posters..." />
//             ) : posters.length === 0 ? (
//                 <p className='text-black'>No posters found. Go generate one!</p>
//             ) : (
//                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:px-6 lg:px-12 p-2">

//                     {posters.map((poster, index) => (
//                         <div
//                             key={index}
//                             className="flex flex-col rounded-xl p-[4px] bg-gradient-to-br from-cyan-700 to-blue-800 shadow-md hover:shadow-lg transition-shadow duration-300"

//                         >
//                             <img
//                                 src={poster.thumbnailUrl || poster.posterUrl}
//                                 alt="Poster"
//                                 className="rounded-md mb-3 object-contain w-full h-48 sm:h-56 md:h-64 bg-white"
//                             />

//                             <div className="flex-1 mx-2">
//                                 <p className="text-xs sm:text-sm italic text-gray-300">
//                                     {poster.carDetails?.year} {poster.carDetails?.make}{" "}
//                                     {poster.carDetails?.model}
//                                 </p>
//                                 <p className="text-xs sm:text-sm font-medium mb-1 text-gray-300">
//                                     Template: {poster.templateId}
//                                 </p>
//                                 <p className="text-xs sm:text-sm text-gray-300 mb-1">
//                                     Created: {poster.createdAt.toDate().toLocaleDateString('en-GB')}
//                                 </p>
//                             </div>

//                             <div className="mt-3 space-y-2 m-2">
//                                 {/* Row 1: Showcase */}
//                                 <div className="flex w-full">
//                                     <a
//                                         href={`/mockup?uid=${encodeURIComponent(uid!)}&posterId=${encodeURIComponent(poster.id)}`}
//                                         target="_blank"
//                                         rel="noopener noreferrer"
//                                         className="flex-1 text-center text-xs sm:text-sm px-3 py-2 rounded bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-colors"
//                                     >
//                                         Showcase
//                                     </a>
//                                 </div>

//                                 {/* Row 2: Download / Share / Delete */}
//                                 <div className="flex flex-wrap gap-2 w-full">
//                                     {/* Download */}
//                                     <button
//                                         onClick={() => handleDownload(poster)}
//                                         className="flex-1 text-center text-xs sm:text-sm px-3 py-2 rounded bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 transition-colors"
//                                     >
//                                         Download
//                                     </button>

//                                     {/* Share */}
//                                     <button
//                                         onClick={async () => {
//                                             if (navigator.share) {
//                                                 try {
//                                                     await navigator.share({
//                                                         title: "Check out my car poster!",
//                                                         url: `/mockup?uid=${encodeURIComponent(uid!)}&posterId=${encodeURIComponent(poster.id)}`,
//                                                     });
//                                                 } catch (err) {
//                                                     console.error("Share failed:", err);
//                                                 }
//                                             } else {
//                                                 await navigator.clipboard.writeText(
//                                                     `/mockup?uid=${encodeURIComponent(uid!)}&posterId=${encodeURIComponent(poster.id)}`
//                                                 );
//                                                 alert("Link copied to clipboard!");
//                                             }
//                                         }}
//                                         className="flex-1 text-center text-xs sm:text-sm px-3 py-2 rounded bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 transition-colors"
//                                     >
//                                         Share
//                                     </button>

//                                     {/* Delete Button */}
//                                     <button
//                                         onClick={() => setSelectedPoster(poster)}
//                                         className="flex-1 text-center text-xs sm:text-sm px-3 py-2 rounded bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 transition-colors"
//                                     >
//                                         Delete
//                                     </button>

//                                     {/* Popup outside the map */}
//                                     {selectedPoster && (
//                                         <div className="p-2 fixed inset-0 flex items-center justify-center backdrop-blur-sm z-50 fade-in">
//                                             <div className="m-2 popup-content p-4 rounded-lg max-w-sm min-h-37 text-center bg-gray-100 relative">
//                                                 <img
//                                                     src="/svg/xmark_gray.svg"
//                                                     alt="Close"
//                                                     className="absolute top-3 right-3 w-6 h-6 cursor-pointer"
//                                                     onClick={() => setSelectedPoster(null)}
//                                                 />
//                                                 <p className="mt-6 mb-4 text-gray-800 text-sm sm:text-base">
//                                                     Are you sure you want to delete your{" "}
//                                                     <span className="font-semibold">
//                                                         {selectedPoster.carDetails.year} {selectedPoster.carDetails.make} {selectedPoster.carDetails.model}
//                                                     </span>{" "}
//                                                     poster?
//                                                 </p>
//                                                 <button
//                                                     onClick={() => {
//                                                         handleDelete(selectedPoster);
//                                                         setSelectedPoster(null);
//                                                     }}
//                                                     className="w-full text-xs sm:text-sm px-3 py-2 rounded bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 transition-colors"
//                                                 >
//                                                     Delete
//                                                 </button>
//                                             </div>
//                                         </div>
//                                     )}

//                                 </div>
//                             </div>

//                         </div>
//                     ))}
//                 </div>

//             )}
//             <button onClick={() => {
//                 router.replace('/account/dashboard');
//             }} className="self-start mt-6 relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-pink-500 to-orange-400 group-hover:from-pink-500 group-hover:to-orange-400 hover:text-white dark:text-white focus:ring-4 focus:outline-none focus:ring-pink-200 dark:focus:ring-pink-800">
//                 <span className="relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-transparent group-hover:dark:bg-transparent">
//                     Back
//                 </span>
//             </button>

//         </div>
//     )
// }

