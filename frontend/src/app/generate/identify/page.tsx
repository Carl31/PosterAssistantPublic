/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// This is the main entry point for poster creation.

'use client'

import { motion } from 'framer-motion'
import { usePosterWizard, isStepAccessible } from '@/context/PosterWizardContext'
import { useAuth } from '@/context/AuthContext'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation';
import Spinner from '@/components/Spinner';

export default function IdentifyVehicleStep() {

    const { user } = useAuth()

    const {
        selectedTemplate,
        carDetails, setCarDetails,
        previewUrl,
        geminiChecked, setGeminiChecked,
        image
    } = usePosterWizard()
    const { state } = usePosterWizard();

    const [loading, setloading] = useState(false)

    const router = useRouter()

    const handleNext = () => {
        router.push('/generate/overview')
    }

    useEffect(() => {
    if (!isStepAccessible("identify", state)) {
      console.log("No image selected. Redirecting.");
      router.replace("/generate/upload");
    }
  }, [state, router]);

    const handleBack = () => {
        setCarDetails({ make: '', model: '', year: '' })
        setGeminiChecked(false)
        router.push('/generate/upload')
    }

    // Detect car details in image using cloud function
    const detectCar = async () => {
        if (!image) return
        setloading(true)

        // Below 2 lines for dummy data
        // const result = await mockDetectCarDetails(image) // dummy data
        // setCarDetails(result as any); // dummy data set


        if (!user) {
            console.error('User is not authenticated.')
            return
        }
        // For sending request to backnend with authorisation:
        const token = user && (await user.getIdToken())

        try {
            // 1. Convert the image file to a Base64 string
            const base64Image = await fileToBase64(image);
            const mimeType = image.type;

            // 2. Prepare the data to send in the request body
            const requestBody = {
                base64Image: base64Image,
                mimeType: mimeType,
            };

            // 3. Make the HTTP POST request using fetch
            const response = await fetch("https://us-central1-posterassistant-aebf0.cloudfunctions.net/detectCarDetailsWithGemini", {
                method: 'POST', // We configured the function to accept POST
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(requestBody), // Send the data as a JSON string
            });

            // 4. Handle the response
            if (!response.ok) {
                // If the server responded with an error status (e.g., 400, 500)
                const errorText = await response.text(); // Get the error message from the body
                console.error(`HTTP error! status: ${response.status}`, errorText);
                throw new Error(`Function returned error: ${response.status} - ${errorText}`);
            }

            // 5. Parse the JSON response from the function
            const result = await response.json(); // The function sends back JSON

            // console.log("Received result from Cloud Function:", result);

            updateCarDetailsFromApiResponse(result);

        } catch (error) {
            console.error("Error calling Cloud Function:", error);
            // Propagate the error or return a default value/structure as needed
            throw error; // Or return { make: "", model: "", year: "", warning: "Client-side error calling function." };
        } finally {
            setloading(false)
            setGeminiChecked(true)
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
                <section id='identify vehicle'>
                    {previewUrl && (
                        <div className="w-full aspect-[3/4] relative rounded-xl shadow-lg overflow-hidden">
                            <img
                                src={previewUrl!}
                                alt="Preview"
                                className="absolute inset-0 w-full h-full object-cover"
                            />
                        </div>
                    )}

                    <button
                        disabled={!image || !selectedTemplate || loading}
                        onClick={detectCar}
                        className="mt-6 bg-blue-600 text-white px-4 py-2 rounded-md"
                    >
                        {loading ? 'Detecting...' : 'Detect Car Info'}
                    </button>

                    {geminiChecked && (
                        <div className="mt-4 space-y-2">
                            <label className="block">Make</label>
                            <input
                                value={carDetails.make}
                                onChange={(e) => setCarDetails({ ...carDetails, make: e.target.value })}
                                className="border p-2 w-full"
                                placeholder="Add make"
                            />
                            <label className="block">Model</label>
                            <input
                                value={carDetails.model}
                                onChange={(e) => setCarDetails({ ...carDetails, model: e.target.value })}
                                className="border p-2 w-full"
                                placeholder="Add model"
                            />
                            <label className="block">Year</label>
                            <input
                                value={carDetails.year}
                                onChange={(e) => setCarDetails({ ...carDetails, year: e.target.value })}
                                className="border p-2 w-full"
                                placeholder="Add year"
                            />
                        </div>
                    )}

                </section>

                <button onClick={handleNext} className="mt-6 bg-blue-600 text-white px-4 py-2 rounded-md">
                    Next Step
                </button>
                <button onClick={handleBack} className="mt-6 bg-red-600 text-white px-4 py-2 rounded-md">
                    Back
                </button>
            </div>
        </motion.div>
    )

    // UTLITY FUNCTIONS:

    // --- Utility function to convert File/Blob to Base64 ---
    function fileToBase64(file: File | Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve((reader.result as string).split(',')[1]); // Get base64 string after "base64,"
            reader.onerror = error => reject(error);
        });
    }

    function updateCarDetailsFromApiResponse(
        responseData: any) { // Use a more specific type if you have one for the full response
        {
            // Check if the responseData has the expected structure
            if (!responseData) {
                console.error("API response is missing:", responseData);
                return;
            }

            const responseObject = responseData.json;

            try {
                // Attempt to parse the string value of the 'message' property
                //const parsedDetails = JSON.parse(jsonString);

                // Basic validation to ensure the parsed object looks like car details
                if (typeof responseObject === 'object' && responseObject !== null) {
                    // Update the state with the parsed JSON object
                    setCarDetails(responseObject);
                    console.log("Car details state updated successfully:", responseObject);
                } else {
                    console.error("Parsed content from 'message' is not an object:", responseObject);
                }


            } catch (error) {
                // Handle cases where JSON.parse fails (e.g., the string isn't valid JSON)
                console.error("Failed to set car details from API response:", error, "Object received:", responseObject);
            }
        };
    }

}