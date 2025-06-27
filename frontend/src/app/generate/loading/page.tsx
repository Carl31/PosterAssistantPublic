
/* eslint-disable @typescript-eslint/no-unused-vars */

'use client'

import { motion } from 'framer-motion'
import { usePosterWizard } from '@/context/PosterWizardContext'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getFirestore, onSnapshot, doc } from "firebase/firestore";


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
                    const encoded = encodeURIComponent(posterUrl!);
                    router.push(`/mockup?url=${encoded}`);
                } else if (data.status === "error") {
                    unsubscribe();
                    console.log("Error generating poster:", data.error);
                    // TODO: redirect to dedicated error page?
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
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <div className="bg-white p-8 rounded shadow-md text-center">
                <h1 className="text-2xl font-bold mb-4">Generating Your Poster</h1>
                <p className="text-gray-700 mb-6">{progress}</p>
                <div className="w-64 bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div
                        className="bg-purple-600 h-full transition-all duration-300"
                        style={{ width: getProgressPercentage(progress!) }}
                    ></div>
                </div>
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
