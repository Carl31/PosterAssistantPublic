
/* eslint-disable @typescript-eslint/no-unused-vars */

'use client'

import { motion } from 'framer-motion'
import { usePosterWizard } from '@/context/PosterWizardContext'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getFirestore, onSnapshot, doc } from "firebase/firestore";
import Spinner from '@/components/Spinner'


/**
 * Page for loading and displaying the progress of a poster generation job.
 * @example
 * <LoadingPage />
 * @returns {JSX.Element} The page component.
 */

export default function LoadingPage() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const jobId = searchParams!.get('jobId')
    const { setProgress, progress } = usePosterWizard()

    function listenToPosterProgress(jobId: string, onUpdate: (progress: string) => void) {
        const db = getFirestore();
        const jobRef = doc(db, "jobs", jobId);

        const unsubscribe = onSnapshot(jobRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();

                if (!data) throw new Error("Job data not found");
                // Prevent UI updates if job is still queued
                if (data.status === 'queued') return

                onUpdate(typeof data.progress === "string" ? data.progress : "");
                if (typeof data.progress !== "string") { console.log("Incorrect progress type:", data.progress); }

                if (data.status === "complete") {
                    unsubscribe();
                    const posterUrl = data.posterUrl; // assuming posterUrl is a property of the data object
                    const encodedUrl = encodeURIComponent(posterUrl!);
                    // router.push(`/mockup?url=${encoded}`);

                    const uid = data.userId;
                    const posterId = data.posterUrl;
                    const encodedUid = encodeURIComponent(uid!);
                    const encodedPosterId = encodeURIComponent(posterId!);
                    // router.push(`/mockup?url=${encodedUrl}&uid=${encodedUid}&posterId=${encodedPosterId}`);
                    router.push('/account/posters?fromLoading=true');
                    window.open(`/mockup?url=${encodedUrl}&uid=${encodedUid}&posterId=${encodedPosterId}`, '_blank');
                } else if (data.status === "error") {
                    unsubscribe();
                    console.log("Error generating poster:", data.error);
                    throw new Error("Error generating poster:", data.error);
                } else if (data.status === "queued") {
                    // Frontend to ignore this
                    console.log("Job queued:", data.progress);
                }
            }
        });

        return unsubscribe;
    }

    useEffect(() => {
        if (!jobId) return

        const unsubscribe = listenToPosterProgress(jobId, (progress) => {
            setProgress(progress);
        });

        return () => {
            unsubscribe()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [jobId, router])

    return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <div className="bg-white p-8 rounded-2xl shadow-2xl text-center max-w-md w-full">
                <h1 className="text-2xl font-extrabold text-gray-800 mb-3">
                    Generating Your Poster
                </h1>
                <p className="text-gray-600 mb-6 text-sm">{progress}</p>
                <div className="flex justify-center m-4 mb-4">
                    <Spinner />
                </div>

                <div className="relative w-full h-4 bg-gray-200 rounded-full overflow-hidden shadow-inner mt-4">
                    <div
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 transition-all duration-500 ease-out"
                        style={{ width: getProgressPercentage(progress!) }}
                    ></div>
                </div>

                <p className="mt-4 text-xs text-gray-500 italic">
                    Please wait while we prepare your design ✨
                </p>
            </div>
        </div>

    )
}

// Optional helper for smoother visual progress
function getProgressPercentage(progress: string): string {
    if (progress === 'Starting...') return '10%'
    if (progress == 'Preparing canvas') return '20%'

    if (progress === 'Opening template') return '30%';
    if (progress === 'Inserting car details') return '40%';
    if (progress === 'Carefully inserting your image') return '50%';
    if (progress === 'Cleaning up the edges') return '60%';

    if (progress === 'Compressing image') return '70%';
    if (progress === 'Uploading poster') return '80%';
    if (progress === 'Complete') return '100%'
    return '20%' // default fallback
}
