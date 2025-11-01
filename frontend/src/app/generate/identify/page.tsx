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
import LoadingPage from '@/components/LoadingPage'
import { notify } from "@/utils/notify";
import Notification from "@/components/Notification";
import ErrorPage from '@/components/ErrorPage'
import { carData, modelExists } from "@/pages/api/carData";
import { Archivo_Black } from "next/font/google";

const archivoBlack = Archivo_Black({
    weight: "400", // Archivo Black only has 400
    subsets: ["latin"],
});

export default function IdentifyVehicleStep() {

    const { user } = useAuth()

    const {
        selectedTemplate,
        carDetails, setCarDetails,
        userImgThumbDownloadUrl, userImgDownloadUrl,
        geminiChecked, setGeminiChecked, useAI, setUseAI,
    } = usePosterWizard()
    const { state } = usePosterWizard();

    const [loading, setloading] = useState(false)
    const [pendingValidation, setpendingValidation] = useState(false)

    const [manualInputClicked, setManualInputClicked] = useState(false);
    const [AiInputClicked, setAiInputClicked] = useState(false);

    const router = useRouter()

    const handleNext = async () => {
        setpendingValidation(true);
        const { valid, reason } = await validateCarDetails(carDetails.make, carDetails.model, carDetails.year);

        if (!valid) {
            setpendingValidation(false);
            console.log("Invalid car details: " + reason);
            notify("error", "Invalid car details: " + reason);
            return;
        } else {
            router.push('/generate/overview')
        }

    }

    useEffect(() => {
        if (!isStepAccessible("identify", state)) {
            console.log("No image selected. Redirecting.");
            router.replace("/generate/upload");
        }
    }, [state, router]);

    const handleBack = () => {
        router.push('/generate/select')
    }

    // Detect car details in image using cloud function (final optimized version)
    const detectCar = async () => {
        if (!userImgThumbDownloadUrl) return
        setloading(true)

        if (!user) {
            console.error('User is not authenticated.')
            return <ErrorPage text="User is not authenticated." />
        }

        try {
            // Get Firebase ID token for authorization
            const token = await user.getIdToken()

            // Prepare minimal payload — only send the image URL
            const requestBody = { imageUrl: userImgThumbDownloadUrl }

            // Call backend Cloud Function
            const response = await fetch(
                "https://us-central1-posterassistant-aebf0.cloudfunctions.net/detectCarDetailsWithGemini",
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(requestBody),
                }
            )

            if (!response.ok) {
                const errorText = await response.text()
                console.error(`HTTP error! status: ${response.status}`, errorText)
                throw new Error(`Function returned error: ${response.status} - ${errorText}`)
            }

            // Parse result and update UI
            const result = await response.json()
            updateCarDetailsFromApiResponse(result)

        } catch (error) {
            console.error("Error calling Cloud Function:", error)
            return <ErrorPage text="Error calling Gemini Cloud Function." />
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
            <Notification />
            <div className="p-2 max-w-xl mx-auto">
                <section id='identify vehicle'>
                    <div className="mt-4 border-3 border-blue-400 px-4 py-2 mb-12 flex flex-col items-center shadow-[0_0_14px_rgba(59,130,246,0.7)]">
                        <h1 className={`text-2xl text-gray-200 ${archivoBlack.className}`}>
                            Identify Your Vehicle
                        </h1>
                    </div>

                    {userImgThumbDownloadUrl && (
                        <div className="w-full aspect-[3/4] relative shadow-lg overflow-hidden">
                            <img
                                src={userImgThumbDownloadUrl!}
                                alt="Preview"
                                className="absolute inset-0 w-full h-full object-cover"
                            />
                        </div>
                    )}

                    {pendingValidation ? <div className="flex justify-center m-4">
                        <div className='mt-3'>
                            <Spinner />
                        </div>
                    </div> : (
                        <div>

                            <div className="flex flex-col items-center">
                                <button
                                    disabled={!userImgThumbDownloadUrl || !selectedTemplate || loading}
                                    onClick={() => {
                                        detectCar();
                                        setAiInputClicked(true);
                                    }}
                                    className={`w-full mt-6 text-white 
      ${AiInputClicked
                                            ? "bg-purple-900 text-gray-200" // permanent dark style
                                            : "bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 hover:bg-gradient-to-br"} 
      focus:ring-4 focus:outline-none focus:ring-purple-300 dark:focus:ring-purple-800 
      shadow-lg shadow-purple-500/50 dark:shadow-lg dark:shadow-purple-800/80 
      font-medium rounded-lg text-sm py-2.5 text-center`}
                                >
                                    {loading ? 'Detecting...' : 'Detect Car Info'}
                                </button>

                                <div className="flex items-center my-4">
                                    <div className="w-1 h-1 bg-purple-500 rounded-full"></div>
                                    <p className="text-purple-500 mx-2">OR</p>
                                    <div className="w-1 h-1 bg-purple-500 rounded-full"></div>
                                </div>

                                <button
                                    disabled={!userImgThumbDownloadUrl || !selectedTemplate || loading}
                                    onClick={() => {
                                        setUseAI(false);
                                        setManualInputClicked(true)
                                    }}
                                    className={`w-full text-white 
      ${manualInputClicked || geminiChecked
                                            ? "bg-purple-900 text-gray-200" // permanent dark style
                                            : "bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 hover:bg-gradient-to-br"} 
      focus:ring-4 focus:outline-none focus:ring-purple-300 dark:focus:ring-purple-800 
      shadow-lg shadow-purple-500/50 dark:shadow-lg dark:shadow-purple-800/80 
      font-medium rounded-lg text-sm py-2.5 text-center`}
                                >
                                    {'Manually Input Car Details'}
                                </button>
                            </div>

                            {(geminiChecked || !useAI) && (
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
                        </div>
                    )}

                </section>

                <div className="mt-5 flex justify-between">
                    <button onClick={handleBack} disabled={loading} className="self-start mt-6 relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-pink-500 to-orange-400 group-hover:from-pink-500 group-hover:to-orange-400 hover:text-white dark:text-white focus:ring-4 focus:outline-none focus:ring-pink-200 dark:focus:ring-pink-800">
                        <span className="relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-transparent group-hover:dark:bg-transparent">
                            Back
                        </span>
                    </button>

                    <button
                        disabled={!geminiChecked && !manualInputClicked && !loading}
                        onClick={handleNext}
                        className={`self-end relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium rounded-lg 
    ${!geminiChecked && !manualInputClicked && !loading ? 'opacity-50 cursor-not-allowed' : ''}
    bg-gradient-to-br from-purple-600 to-blue-500 group-hover:from-purple-600 group-hover:to-blue-500 hover:text-white dark:text-white 
    focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800`}
                    >
                        <span
                            className={`relative px-5 py-2.5 transition-all ease-in duration-75 
      ${!geminiChecked && !manualInputClicked && !loading ? 'bg-gray-400 dark:bg-gray-700' : 'bg-white dark:bg-gray-900'} 
      rounded-md group-hover:bg-transparent group-hover:dark:bg-transparent`}
                        >
                            Next
                        </span>
                    </button>
                </div>
            </div>

        </motion.div>
    )

    // UTLITY FUNCTIONS:

    // For validating car data
    // Validate car make, model, and year using NHTSA API
    async function validateCarDetails(make: string, model: string, year: string): Promise<{ valid: boolean; reason?: string }> {
        try {
            // Normalize inputs
            make = make.trim().toLowerCase();
            model = model.split(' ')[0].trim().toLowerCase();

            if (!/^\d{4}$/.test(year)) return { valid: false, reason: "Invalid year" };
            if (make.length === 0) return { valid: false, reason: "Make is required" };
            if (model.length === 0) return { valid: false, reason: "Model is required" };

            // 1. Validate Make
            const makeRes = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/GetAllMakes?format=json`);
            const makesData = await makeRes.json();
            const validMakes = makesData.Results.map((m: any) => m.Make_Name.toLowerCase());
            if (!validMakes.includes(make)) {
                return { valid: false, reason: `Unrecognized make: "${make}"` };
            }

            // 2. Validate Model for Make
            const modelRes = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMake/${make}?format=json`);
            const modelData = await modelRes.json();
            const validModels = modelData.Results.map((m: any) => m.Model_Name.toLowerCase());
            if (!validModels.includes(model)) {
                const exists = modelExists(make, model); // If model is not present on american car database, check if it exists in Japanese db (locally stored).
                if (true) return { valid: true }; // This "true" is a placeholder. Its meant to be "exists". But temporarily allowing all models for makes, as the database is not comprehensive enough and blocks some models from being used in app.
                return { valid: false, reason: `Model "${model}" is not valid for make "${make}"` };
            }

            // 3. Validate Year for Make+Model (TODO: Somehow rewrite this year validation without using NHTSA API, it's not comprehensive enough.)
            // const yearRes = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeYear/make/${make}/modelyear/${year}?format=json`);
            // const yearData = await yearRes.json();
            // const modelsThisYear = yearData.Results.map((m: any) => m.Model_Name.toLowerCase());
            // if (!modelsThisYear.includes(model)) {
            //     return { valid: false, reason: `Model "${model}" was not produced in year ${year}` };
            // }

            return { valid: true };
        } catch (error) {
            console.error("Validation error:", error);
            return { valid: false, reason: "Failed to validate vehicle details. Please try again." };
        }
    }


    // --- Utility function to convert File/Blob to Base64 ---
    function fileToBase64(file: File | Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve((reader.result as string).split(',')[1]); // Get base64 string after "base64,"
            reader.onerror = error => reject(error);
        });
    }

    async function convertImageUrlToBase64(imageUrl: string): Promise<{ base64Image: string; mimeType: string }> {
        const response = await fetch(imageUrl);
        const blob = await response.blob();

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64data = reader.result as string;
                const mimeType = blob.type;
                resolve({ base64Image: base64data.split(',')[1], mimeType }); // strip data URI prefix
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    // Necessary for formatting and setting car details with no errors
    function updateCarDetailsFromApiResponse(responseData: { make: string; model: string; year: string }) {
        if (!responseData) {
            console.error("API response is missing:", responseData);
            return;
        }

        // Use the object directly
        const carDetails = responseData;

        // Update state
        setCarDetails(carDetails);
        console.log("Car details state updated successfully:", carDetails);

        const missingMake = carDetails.make === "";
        const missingModel = carDetails.model === "";
        const missingYear = carDetails.year === "";

        if (missingMake && missingModel && missingYear) {
            notify("warning", "Our AI could not identify the car. Please input the details manually.");
        } else {
            if (missingMake) {
                notify("info", "Our AI could not identify the make of the car. Please input the details manually.");
            }
            if (missingModel) {
                notify("info", "Our AI could not identify the model of the car. Please input the details manually.");
            }
            if (missingYear) {
                notify("info", "Our AI could not identify the year of the car. Please input the details manually.");
            }
        }
    }

}