
/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-unused-vars */

// This is the main entry point for poster creation.

'use client'

import { motion } from 'framer-motion'
import { usePosterWizard, isStepAccessible } from '@/context/PosterWizardContext'
import { useAuth } from '@/context/AuthContext'
import { useState, useEffect, useRef } from 'react'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase/client'
import { useRouter } from 'next/navigation';
import LoadingPage from '@/components/LoadingPage'
import ErrorPage from '@/components/ErrorPage'

type CarDetails = {
    make: string
    model: string
    year: string
}

const DESCRIPTION_COOLDOWN_MS = 1000; // 1 second buffer between runs

export default function OverviewPage() {

    const { user } = useAuth()

    const {
        selectedTemplate, carDetails,
        description, setDescription, instagramHandle,
        previewUrl, prevCarDetails, setPrevCarDetails
    } = usePosterWizard()
    const { state } = usePosterWizard();

    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const isGeneratingRef = useRef(false);
    const lastGeneratedAtRef = useRef<number>(0);

    function deepEqual(carDetails1: CarDetails, carDetails2: CarDetails): boolean {
        return (
            carDetails1.make === carDetails2.make &&
            carDetails1.model === carDetails2.model &&
            carDetails1.year === carDetails2.year
        );
    }

    useEffect(() => {
    if (!isStepAccessible("overview", state)) {
      console.log("No car identified. Redirecting.");
      router.replace("/generate/identify");
    }
  }, [state, router]);
    

    // Basically, generates description when car details change from prvious page.
    useEffect(() => {
        // Only run if template supports description
        if (!selectedTemplate?.supportedTexts?.includes("description")) return;
        if (!carDetails || !carDetails.make) return;

        const now = Date.now();
        const cooldownPassed = now - lastGeneratedAtRef.current > DESCRIPTION_COOLDOWN_MS;
        const detailsChanged = !deepEqual(prevCarDetails, carDetails);

        if (detailsChanged && cooldownPassed && !isGeneratingRef.current) {
            setLoading(true);
            isGeneratingRef.current = true;

            const generate = async () => {
                try {
                    console.log("Generating new description...");
                    const newDescription = await generateDescription();
                    setPrevCarDetails(carDetails);
                    lastGeneratedAtRef.current = Date.now();
                } catch (err) {
                    console.error("Description generation failed:", err);
                } finally {
                    isGeneratingRef.current = false;
                    setLoading(false);
                }
            };

            generate();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [carDetails, selectedTemplate]);

    const handleBack = () => {
        // setDescription('')
        // setPosterUrl('')
        router.push('/generate/identify')
    }

    // Uses cloud function to generate description
    const generateDescription = async () => {
        if (!carDetails) return

        // For sending request to backnend with authorisation:
        const token = await user!.getIdToken()

        try {

            // 1. Prepare the data to send in the request body
            const requestBody = {
                make: carDetails.make,
                model: carDetails.model,
                year: carDetails.year
            };

            // 2. Make the HTTP POST request using fetch
            const response = await fetch("https://us-central1-posterassistant-aebf0.cloudfunctions.net/generateCarDescriptionWithGemini", {
                method: 'POST', // We configured the function to accept POST
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(requestBody), // Send the data as a JSON string
            });

            // 3. Handle the response
            if (!response.ok) {
                // If the server responded with an error status (e.g., 400, 500)
                const errorText = await response.text(); // Get the error message from the body
                console.error(`HTTP error! status: ${response.status}`, errorText);
                throw new Error(`Function returned error: ${response.status} - ${errorText}`);
            }

            // 4. Parse the JSON response from the function
            const result = await response.json(); // The function sends back JSON

            // console.log("Received result from Cloud Function:", result);
            console.log("Car description state updated successfully:", result.text);
            setDescription(result.text);

            // The function is designed to return a JSON object { make, model, year }

        } catch (error) {
            console.error("Error calling Cloud Function:", error);
            // Propagate the error or return a default value/structure as needed
            throw error; // Or return { make: "", model: "", year: "", warning: "Client-side error calling function." };
        } finally {
            // setLoadingDescription(false)
        }
    }

    const savePosterMetadata = async (uid: string, imageUrl: string) => { // TODO: need to use this somewhere!
        const posterId = crypto.randomUUID()

        await setDoc(doc(db, 'users', uid, 'posters', posterId), {
            imageUrl,
            createdAt: serverTimestamp(),
            inputImageUrl: previewUrl,
            templateId: selectedTemplate?.id,
            description,
            carDetails,
            instagramHandle
        })
    }

    // For progress updates
    // function listenToPosterProgress(jobId: string, onUpdate: (progress: string) => void) {
    //     const db = getFirestore();
    //     const jobRef = doc(db, "jobs", jobId);

    //     const unsubscribe = onSnapshot(jobRef, (docSnap) => {
    //         if (docSnap.exists()) {
    //             const data = docSnap.data();
    //             onUpdate(data.progress || "");

    //             if (data.status === "complete" || data.status === "error") {
    //                 unsubscribe();
    //             }
    //         }
    //     });

    //     return unsubscribe;
    // }

    // Generating poster using fetch
    const handleGeneratePoster = async () => {

        // try {
        //     await generateDescription();
        // } catch (error) {
        //     console.error("Error generating description:", error);
        // }


        if (!user) {
            console.error('User is not authenticated.')
            return <ErrorPage text="User is not authenticated." />
        }
        // For sending request to backnend with authorisation:
        const token = user && (await user.getIdToken())

        const jobId = crypto.randomUUID();

        // setProgress("Starting...");
        // const unsubscribe = listenToPosterProgress(jobId, (progress) => {
        //     setProgress(progress);
        // });


        setLoading(true)
        try {
            const response = await fetch('/api/startPosterJob', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    psdUrl: selectedTemplate?.psdFileUrl,
                    templateId: selectedTemplate?.id,
                    userImageUrl: previewUrl,
                    carDetails,
                    description,
                    instagramHandle,
                    fontsUsed: selectedTemplate?.fontsUsed,
                    jobId,
                    token,
                    userId: user.uid
                })
            })

            if (!response.ok) {
                const contentType = response.headers.get("content-type");

                if (contentType && contentType.includes("application/json")) {
                    const errorData = await response.json();
                    throw new Error(`API responded with ${response.status}: ${errorData.error || JSON.stringify(errorData)}`);
                } else {
                    const errorText = await response.text(); // fallback if not JSON
                    throw new Error(`API responded with ${response.status}: ${errorText}`);
                }
            }

            console.log("API Response:", response)

            router.push(`/generate/loading?jobId=${jobId}`)

            // const { imageUrl } = await response.json()
            // setPosterUrl(imageUrl)

            // // ✅ Save to Firestore
            // await savePosterMetadata(user.uid, imageUrl)
        } catch (err) {
            console.error('Error sending request:', err)
            setLoading(false)
        } finally {
            // unsubscribe();
            // setLoading(false)
        }
    }


    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
        >
            <div className="p-8 max-w-xl mx-auto">
                {loading ? <LoadingPage text="Generating poster..." /> : (
                    <span>
                        <section id='overview'>
                            {previewUrl && (
                                <div className="w-full aspect-[3/4] relative rounded-xl shadow-lg overflow-hidden">
                                    <img
                                        src={previewUrl!}
                                        alt="Preview"
                                        className="absolute inset-0 w-full h-full object-cover"
                                    />
                                </div>
                            )}

                            <h1>+</h1>

                            {selectedTemplate && (
                                <div className="w-full aspect-[3/4] relative rounded-xl shadow-lg overflow-hidden">
                                    <img
                                        src={selectedTemplate.previewImageUrl}
                                        alt="Preview"
                                        className="absolute inset-0 w-full h-full object-cover"
                                    />
                                </div>
                            )}


                        </section>

                        <button onClick={handleGeneratePoster} className="mt-6 bg-purple-600 text-white px-4 py-2 rounded-md">
                            Generate!
                        </button>
                        <button onClick={handleBack} className="mt-6 bg-red-600 text-white px-4 py-2 rounded-md">
                            Back
                        </button>
                    </span>
                )}

            </div>
        </motion.div>
    )

}