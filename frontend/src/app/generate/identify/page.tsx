/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Archivo_Black } from 'next/font/google'

import { usePosterWizard, isStepAccessible } from '@/context/PosterWizardContext'
import { useAuth } from '@/context/AuthContext'

import Spinner from '@/components/Spinner'
import LoadingPage from '@/components/LoadingPage'
import ErrorPage from '@/components/ErrorPage'
import Notification from '@/components/Notification'
import { notify } from '@/utils/notify'
import { carData, modelExists } from '@/utils/carData'
import { Credit } from '@/types/credit'

const archivoBlack = Archivo_Black({
  weight: '400',
  subsets: ['latin'],
})

export default function IdentifyVehicleStep() {
  const { user } = useAuth()
  const { state } = usePosterWizard()
  const {
    selectedTemplate,
    carDetails,
    setCarDetails,
    userImgThumbDownloadUrl,
    userImgDownloadUrl,
    geminiChecked,
    setGeminiChecked,
    useAI,
    setUseAI,
    credits,
    setCredits,
  } = usePosterWizard()

  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [pendingValidation, setPendingValidation] = useState(false)
  const [manualInputClicked, setManualInputClicked] = useState(false)
  const [AiInputClicked, setAiInputClicked] = useState(false)
  const [carJamClicked, setCarJamClicked] = useState(false)

  const [showOptionsPopup, setShowOptionsPopup] = useState(false)
  const [showPlatePopup, setShowPlatePopup] = useState(false)
  const [plateLoading, setPlateLoading] = useState(false)
  const [detectedPlate, setDetectedPlate] = useState('')

  const [geminiLoading, setGeminiLoading] = useState(false)

  const [detailsFromCarJam, setDetailsFromCarJam] = useState({ make: '', model: '', year: '' })
  const [detailsFromAI, setDetailsFromAI] = useState({ make: '', model: '', year: '' })

  // Navigation
  const handleBack = () => router.push('/generate/select')

  const handleNext = async () => {
    setPendingValidation(true)
    const { valid, reason } = await validateCarDetails(
      carDetails.make,
      carDetails.model,
      carDetails.year
    )

    if (!valid) {
      setPendingValidation(false)
      console.log('Invalid car details: ' + reason)
      notify('error', 'Invalid car details: ' + reason)
      return
    }

    router.push('/generate/overview')
  }

  useEffect(() => {
    if (!isStepAccessible('identify', state)) {
      console.log('No image selected. Redirecting.')
      router.replace('/generate/upload')
    }
    console.log(selectedTemplate?.name);
  }, [state, router])

  // Popups
  const handleIdentify = () => setShowOptionsPopup(true)
  const handleCancel = () => setShowOptionsPopup(false)

  const handleUseAi = () => {
    setShowOptionsPopup(false)
    detectCar()
  }

  const handleUseCarJam = async () => {
    if (carJamClicked) {
      notify('info', 'CarJam already detected the car.');
      setShowOptionsPopup(false)
      setCarDetails(detailsFromCarJam);
      return
    }

    setShowOptionsPopup(false)

    if (credits.carJam <= 0) {
      notify('error', 'You have no CarJam credits left.')
      return
    } else {
      setCredits(prev => ({ ...prev, carJam: prev.carJam - 1 } as Credit)); // no reason to do this, as this only updates state. Not firestore.
    }


    setPlateLoading(true)
    setShowPlatePopup(true)

    console.log('Using CarJam for plate detection.')

    try {
      const token = await user!.getIdToken();
      const response = await fetch(
        "https://us-central1-posterassistant-aebf0.cloudfunctions.net/detectCarPlate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ imageUrl: userImgThumbDownloadUrl }),
        }
      );

      if (!response.ok) {
        const text = await response.text();
        console.error("Plate detection failed:", text);
        notify("error", "AI could not detect plate. Please enter manually.");
        setDetectedPlate("");
      } else {
        const data = await response.json();
        if (data.plate == "" || data.plate == null || data.plate == undefined) {
          notify("info", "AI could not detect plate. Please enter manually.");
        }
        setDetectedPlate(data.plate || "");
        console.log("Detected plate:", data.plate);
      }
    } catch (err) {
      console.error("Error calling detectPlateOnly:", err);
      notify("error", "Error detecting plate.");
    } finally {
      console.log("Plate detection complete.");
      setPlateLoading(false);
    }
  }

  function updateCarJamData(responseData: { make: string; model: string; year: string }) {
    if (!responseData) {
      console.error('API response is missing:', responseData)
      return
    }

    setDetailsFromCarJam(responseData)
  }

  function updateAiData(responseData: { make: string; model: string; year: string }) {
    if (!responseData) {
      console.error('API response is missing:', responseData)
      return
    }

    const capitalized = {
      ...responseData,
      make: responseData.make ? responseData.make.toUpperCase() : '',
      model: responseData.model ? responseData.model.toUpperCase() : '',
    };

    setDetailsFromAI(capitalized)
  }

  const handleConfirmCarJam = async () => {

    console.log('Confirming CarJam...')
    console.log('Detected plate:', detectedPlate)
    if (!detectedPlate) {
      notify('error', 'Please enter a valid plate number.')
      return
    }
    setPlateLoading(true)

    try {
      const token = await user!.getIdToken()
      const response = await fetch(
        'https://us-central1-posterassistant-aebf0.cloudfunctions.net/fetchPlateWithCarJam',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ plate: detectedPlate }),
        }
      )

      if (!response.ok) {
        const text = await response.text()
        console.error('CarJam failed:', text)
        notify('error', 'Failed to fetch details from CarJam.')
        return
      }

      const data = await response.json()
      console.log('CarJam response:', data)

      if (data.status === 'plate_not_found_in_carjam') {
        notify('info', `Plate ${detectedPlate} not found in CarJam. Please enter details manually.`);
      } else if (data.status === 'no_credits_left') {
        notify('error', `No credits left for CarJam API.`);
      } else if (data.status === 'no_plate_provided') {
        notify('error', `Plate ${detectedPlate} not provided.`);
      } else {
        updateCarDetailsFromApiResponse(data)
        updateCarJamData(data)
        setGeminiChecked(true)
        setCarJamClicked(true)
        setShowPlatePopup(false)
      }

    } catch (err) {
      console.error('Error calling CarJam:', err)
      notify('error', 'CarJam request failed.')
    } finally {
      setPlateLoading(false)
    }
  }

  const handleCancelCarJam = () => setShowPlatePopup(false)

  function updateCarDetailsFromApiResponse(responseData: { make: string; model: string; year: string }) {
    if (!responseData) {
      console.error('API response is missing:', responseData);
      return;
    }

    const capitalized = {
      ...responseData,
      make: responseData.make ? responseData.make.toUpperCase() : '',
      model: responseData.model ? responseData.model.toUpperCase() : '',
    };

    setCarDetails(capitalized);

    const missingMake = capitalized.make === '';
    const missingModel = capitalized.model === '';
    const missingYear = capitalized.year === '';

    if (missingMake && missingModel && missingYear) {
      notify('warning', 'Our AI could not identify the car. Please input the details manually.');
    } else {
      if (missingMake) notify('info', 'Our AI could not identify the make of the car.');
      if (missingModel) notify('info', 'Our AI could not identify the model of the car.');
      if (missingYear) notify('info', 'Our AI could not identify the year of the car.');
    }

  }

  // Cloud Functions
  const detectCar = async () => {
    console.log('Detecting car...')
    if (AiInputClicked) {
      console.log('AI already detected the car.')
      notify('info', 'AI already detected the car.')
      setCarDetails(detailsFromAI);
      return
    }

    if (!userImgThumbDownloadUrl) return
    setLoading(true)
    setGeminiLoading(true)

    if (!user) {
      console.error('User is not authenticated.')
      return <ErrorPage text="User is not authenticated." />
    }

    if (credits.ai <= 0) {
      notify('error', 'You have no AI credits left.')
      setGeminiLoading(false)
      setLoading(false)
      return
    } else {
      setCredits(prev => ({ ...prev, ai: prev.ai - 1 } as Credit)); // no reason to do this, as this only updates state. Not firestore.
    }

    setAiInputClicked(true)

    try {
      const token = await user.getIdToken()
      const response = await fetch(
        'https://us-central1-posterassistant-aebf0.cloudfunctions.net/detectCarDetailsWithGemini',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ imageUrl: userImgThumbDownloadUrl }),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`HTTP error! status: ${response.status}`, errorText)
        throw new Error(`Function returned error: ${response.status} - ${errorText}`)
      }

      const result = await response.json()

      if (result.status === 'no_credits_left') {
        notify('error', 'You have no AI credits left.')
        return
      }

      updateCarDetailsFromApiResponse(result)
      updateAiData(result)
    } catch (error) {
      console.error('Error calling Cloud Function:', error)
      return <ErrorPage text="Error calling Gemini Cloud Function." />
    } finally {
      console.log('Done detecting car.')
      setGeminiLoading(false)
      setLoading(false)
      setGeminiChecked(true)
    }
  }

  // Render
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <div className="p-4 max-w-xl mx-auto space-y-8">

        {/* =======================
        IDENTIFY VEHICLE HEADER
       ======================= */}
        <section id="identify-vehicle" className="space-y-6">
          <div className="flex flex-col items-center mb-6 relative p-[4px] bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl">
            <div className="flex flex-col items-center bg-white rounded-xl px-6 py-6 w-full">
              <h1 className={`text-3xl sm:text-4xl md:text-5xl text-blue-400 text-center mb-2 ${archivoBlack.className}`}>
                Identify Your Vehicle
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-gray-700 text-center">
                Or let us identify it for you!
              </p>
            </div>
          </div>

          {/* =======================
            IMAGE PREVIEW
           ======================= */}
          {userImgThumbDownloadUrl && (
            <div className="relative w-full max-w-xs mx-auto rounded-xl overflow-hidden shadow-lg">
              <img
                src={userImgThumbDownloadUrl}
                alt="Preview"
                className="w-full h-auto object-contain"
              />
            </div>
          )}

          {/* =======================
            MAIN ACTION AREA
           ======================= */}
          {pendingValidation ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : (
            <div className="space-y-6">
              {/* AI DETECTION BUTTON */}
              <button
                disabled={!userImgThumbDownloadUrl || !selectedTemplate || loading}
                onClick={handleIdentify}
                className={`
                        w-full rounded-xl py-3 text-sm font-semibold text-white
                        bg-gradient-to-r from-cyan-500 to-blue-500
                        hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-cyan-300
                        disabled:opacity-50 disabled:cursor-not-allowed
                        shadow-md
                    `}
              >
                {loading ? "Detecting..." : "Detect car info"}
              </button>

              {/* OR DIVIDER */}
              <div className="flex items-center justify-center gap-3 text-sm text-gray-400">
                <span className="h-px w-12 bg-gray-300" />
                OR
                <span className="h-px w-12 bg-gray-300" />
              </div>

              {/* MANUAL INPUT BUTTON */}
              <button
                disabled={manualInputClicked || geminiChecked || carJamClicked || loading}
                onClick={() => {
                  setUseAI(false);
                  setManualInputClicked(true);
                }}
                className={`
                        w-full rounded-xl py-3 text-sm font-semibold text-white
                        bg-gradient-to-r from-cyan-500 to-blue-500
                        hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-cyan-300
                        disabled:opacity-50 disabled:cursor-not-allowed
                        shadow-md
                    `}
              >
                Manually input car details
              </button>

              {/* =======================
                    MANUAL INPUT FORM
                   ======================= */}
              {(geminiChecked || manualInputClicked || carJamClicked) && (
                <div className="space-y-4 rounded-2xl bg-white p-4 shadow-md">
                  <div>
                    <label className="block text-sm text-gray-900 mb-1">Make</label>
                    <input
                      value={carDetails.make}
                      onChange={(e) =>
                        setCarDetails({ ...carDetails, make: e.target.value })
                      }
                      className="w-full rounded-lg text-black border-2 border-gray-300 px-3 py-2 focus:ring-2 focus:ring-cyan-300 focus:outline-none"
                      placeholder="e.g. Toyota"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-900 mb-1">Model</label>
                    <input
                      value={carDetails.model}
                      onChange={(e) =>
                        setCarDetails({ ...carDetails, model: e.target.value })
                      }
                      className="w-full rounded-lg border-2 text-black border-gray-300 px-3 py-2 focus:ring-2 focus:ring-cyan-300 focus:outline-none"
                      placeholder="e.g. Corolla"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-900 mb-1">Year</label>
                    <input
                      value={carDetails.year}
                      onChange={(e) =>
                        setCarDetails({ ...carDetails, year: e.target.value })
                      }
                      className="w-full rounded-lg border-2 text-black border-gray-300 px-3 py-2 focus:ring-2 focus:ring-cyan-300 focus:outline-none"
                      placeholder="e.g. 2018"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* =======================
        NAVIGATION BUTTONS
       ======================= */}
        <div className="flex justify-between gap-4">
          <button
            onClick={handleBack}
            disabled={loading}
            className="
                w-full max-w-[140px] rounded-xl py-2 text-sm font-semibold
                bg-white text-gray-800 shadow-md
                border border-gray-200
                hover:bg-gray-50
                disabled:opacity-50
            "
          >
            Back
          </button>

          <button
            onClick={handleNext}
            disabled={!geminiChecked && !manualInputClicked && !loading}
            className="
                w-full max-w-[140px] rounded-xl py-2 text-sm font-semibold text-white
                bg-gradient-to-r from-cyan-500 to-blue-500
                hover:brightness-110
                focus:outline-none focus:ring-2 focus:ring-cyan-300
                disabled:opacity-50 disabled:cursor-not-allowed
                shadow-md
            "
          >
            Next
          </button>
        </div>
        {/* =========================
    OPTIONS POPUP (LIGHT)
   ========================= */}
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center
    bg-white/40 backdrop-blur-md transition-opacity
    ${showOptionsPopup ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-[0_10px_40px_rgba(0,0,0,0.15)]">
            <p className="mb-6 text-gray-800 text-lg font-semibold">
              How should we identify the vehicle?
            </p>

            <div className="flex gap-4">
              <button
                onClick={handleUseAi}
                className="flex-1 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 py-2 text-white font-medium hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-cyan-300"
              >
                Use AI
              </button>
              <button
                onClick={handleUseCarJam}
                className="flex-1 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 py-2 text-white font-medium hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-cyan-300"
              >
                Use CarJam
              </button>
            </div>

            <button
              onClick={handleCancel}
              className="mt-6 w-full rounded-lg border border-gray-300 bg-white py-2 text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* =========================
    AI LOADING POPUP (LIGHT)
   ========================= */}
        {geminiLoading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/40 backdrop-blur-md">
            <div className="rounded-2xl bg-white p-6 text-center shadow-[0_10px_40px_rgba(0,0,0,0.15)]">
              <Spinner />
              <p className="mt-4 text-gray-700 font-medium">
                Asking AI for car details…
              </p>
            </div>
          </div>
        )}

        {/* =========================
    PLATE CONFIRM POPUP (LIGHT)
   ========================= */}
        {showPlatePopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/40 backdrop-blur-md">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-[0_10px_40px_rgba(0,0,0,0.15)]">
              {plateLoading ? (
                <>
                  <Spinner />
                  <p className="mt-4 text-gray-700 font-medium">
                    {detectedPlate ? "Fetching CarJam data…" : "Detecting plate…"}
                  </p>
                </>
              ) : (
                <>
                  <p className="mb-4 text-gray-800 font-semibold">
                    Confirm plate number
                  </p>

                  <input
                    value={detectedPlate}
                    onChange={(e) => setDetectedPlate(e.target.value.toUpperCase())}
                    className="w-full rounded-lg border-2 border-gray-300 bg-white p-2 text-center text-gray-800 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                  />

                  <div className="mt-4 flex gap-4">

                    <button
                      onClick={handleCancelCarJam}
                      className="flex-1 rounded-lg border border-gray-300 bg-white py-2 text-gray-700 hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmCarJam}
                      className="flex-1 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 py-2 text-white font-medium hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                    >
                      Confirm
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

      </div>

    </motion.div>
  )
}

/* ------------------ Utility Functions ------------------ */

async function validateCarDetails(
  make: string,
  model: string,
  year: string
): Promise<{ valid: boolean; reason?: string }> {
  try {
    make = make.trim().toLowerCase()
    model = model.split(' ')[0].trim().toLowerCase()

    if (!/^\d{4}$/.test(year)) return { valid: false, reason: 'Invalid year' }
    if (make.length === 0) return { valid: false, reason: 'Make is required' }
    if (model.length === 0) return { valid: false, reason: 'Model is required' }

    const makeRes = await fetch(
      'https://vpic.nhtsa.dot.gov/api/vehicles/GetAllMakes?format=json'
    )
    const makesData = await makeRes.json()
    const validMakes = makesData.Results.map((m: any) => m.Make_Name.toLowerCase())
    if (!validMakes.includes(make)) return { valid: false, reason: `Unrecognized make: "${make}"` }

    const modelRes = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMake/${make}?format=json`
    )
    const modelData = await modelRes.json()
    const validModels = modelData.Results.map((m: any) => m.Model_Name.toLowerCase())
    const exists = modelExists(make, model)
    if (!validModels.includes(model)) return { valid: true } // Temporary placeholder

    return { valid: true }
  } catch (error) {
    console.error('Validation error:', error)
    return { valid: false, reason: 'Failed to validate vehicle details. Please try again.' }
  }
}

function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = (error) => reject(error)
  })
}

async function convertImageUrlToBase64(
  imageUrl: string
): Promise<{ base64Image: string; mimeType: string }> {
  const response = await fetch(imageUrl)
  const blob = await response.blob()

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64data = reader.result as string
      const mimeType = blob.type
      resolve({ base64Image: base64data.split(',')[1], mimeType })
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}








