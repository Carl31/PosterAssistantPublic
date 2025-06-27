/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// This is the main entry point for poster creation.
// NOTE: This page is no longer being used.

'use client'

import { useAuth } from '@/context/AuthContext'
import { useState, useEffect } from 'react'
import { collection, getDocs, doc, updateDoc, arrayUnion, arrayRemove, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase/client'
import TemplateCard from '@/components/TemplateCard'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { auth } from '@/firebase/client'
import { useRouter } from 'next/navigation';
import imageCompression from 'browser-image-compression';
import { getFirestore, onSnapshot } from "firebase/firestore";
import Spinner from '@/components/Spinner';

// Below for using httpsCallable function (not currently in use)
//import { functions } from '@/firebase/client'
//import { httpsCallable } from 'firebase/functions'

type Template = {
    id: string
    name: string
    psdFileUrl: string
    fontsUsed: string[]
    previewImageUrl: string
    // etc. Can add more here if wanting to use them on this page.
}

export default function GeneratePage() {
    const router = useRouter();

    // For uploading image
    const [image, setImage] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)

    // For templates
    const [templates, setTemplates] = useState<any[]>([])
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)

    // For showing user's favorite templates & instagramHandle
    const { user } = useAuth()
    const [favoriteTemplates, setFavoriteTemplates] = useState<string[]>([])
    const [instagramHandle, setInstagramHandle] = useState('')


    // For AI vehicle identification
    const [carDetails, setCarDetails] = useState({
        make: '',
        model: '',
        year: ''
    })
    const [loadingDetection, setLoadingDetection] = useState(false)
    const [geminiChecked, setGeminiChecked] = useState(false); // to check if gemini has attempted to recognise the vehicle yet or not

    // For generating description of vehicle
    const [description, setDescription] = useState('')
    const [loadingDescription, setLoadingDescription] = useState(false)

    // For generating poster
    const [loading, setLoading] = useState(false)

    const [posterUrl, setPosterUrl] = useState<string | null>(null)

    // For progress updates
    const [progress, setProgress] = useState<string | null>(null);



    // Load all templates
    useEffect(() => {
        const fetchTemplates = async () => {
            const snapshot = await getDocs(collection(db, 'templates'))
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            setTemplates(data)
        }
        fetchTemplates()

    }, [])

    // Fetch favorites when user is loaded
    useEffect(() => {
        const fetchFavorites = async () => {
            if (!user) return
            const userRef = doc(db, 'users', user.uid)
            const userSnap = await getDoc(userRef)
            const data = userSnap.data()
            setFavoriteTemplates(data?.settings?.favouriteTemplates || [])
            setInstagramHandle(data?.instagramHandle || '')
        }
        fetchFavorites()
    }, [user])

    // For changing pages if posterUrl is detected (i.e. poster is finished generating)
    useEffect(() => {
        if (posterUrl) {
            const encoded = encodeURIComponent(posterUrl);
            router.push(`/mockup?url=${encoded}`);
        }
    }, [posterUrl, router]);

    // For uploading user image to Firestore (for Photopea to access later) and setting it in the UI
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        let file = e.target.files?.[0]
        const user = auth.currentUser
        let valid = true;
        let compressed = false;
        let compressedFile = null;

        if (!file || !user) return


        // validates file
        if (file) {

            // Check file type is an image
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file. The file you selected is not an image.');
                const imageInput = document.getElementById("imageInput") as HTMLInputElement;
                imageInput.value = "";
                valid = false;
                return;
            } else {
                // File is an image, proceed with upload or other actions
                console.log('File is an image. Proceeding...');
            }

            // Check file size is below 5mb
            const fileSizeInMB = file.size / (1024 * 1024); // Convert bytes to MB
            if (fileSizeInMB > 5 && fileSizeInMB <= 25) { // Compresses file
                // For simply showing an alert
                // alert('File size exceeds 5MB. Please select a smaller file.');
                // const imageInput = document.getElementById("imageInput") as HTMLInputElement;
                // imageInput.value = "";
                // valid = false;
                // return;

                // Compress image
                const options = {
                    maxSizeMB: 4, // Try to get it well under 5MB
                    maxWidthOrHeight: 7000, // Prevent huge resolutions
                    useWebWorker: true,
                    fileType: 'image/jpeg',
                    initialQuality: 0.9,
                };

                try {
                    compressedFile = await imageCompression(file, options);
                    console.log('Size of original file:', file.size / (1024 * 1024), 'MB');
                    // print size of compressed file
                    console.log('Size of compressed file:', compressedFile.size / (1024 * 1024), 'MB');
                    compressed = true;
                } catch (error) {
                    console.error('Image compression failed:', error);
                    const imageInput = document.getElementById("imageInput") as HTMLInputElement;
                    imageInput.value = "";
                    valid = false;
                    return;
                }
            } else if (fileSizeInMB <= 5) { // uploads file.
                // File is within the size limit, proceed with upload or other actions
                // console.log('File size is acceptable.');

            } else { // File is too large
                alert('File size exceeds 25MB. Please select a smaller file.');
                const imageInput = document.getElementById("imageInput") as HTMLInputElement;
                imageInput.value = "";
                valid = false;
                return;
            }

        }



        if (valid) {
            if (compressed) {
                file = compressedFile!;
            }

            setImage(file);
            const storage = getStorage()
            const storageRef = ref(storage, `user_uploads/${user.uid}/${file.name}`)

            try {
                const snapshot = await uploadBytes(storageRef, file)
                const downloadURL = await getDownloadURL(snapshot.ref)

                setPreviewUrl(downloadURL) // ✅ Use downloadURL instead of in-memory blob
            } catch (err) {
                console.error('Image upload failed:', err)
                alert('Failed to upload image. Please try again.')
            }

        }

    }


    // Toggle favorite
    const toggleFavorite = async (templateId: string) => {
        if (!user) return
        const userRef = doc(db, 'users', user.uid)
        const isFav = favoriteTemplates.includes(templateId)

        await updateDoc(userRef, {
            'settings.favouriteTemplates': isFav
                ? arrayRemove(templateId)
                : arrayUnion(templateId)
        })

        setFavoriteTemplates((prev) =>
            isFav ? prev.filter((id) => id !== templateId) : [...prev, templateId]
        )
    }

    // Simulate AI vehicle identification

    const mockDetectCarDetails = async (imageFile: File) => {
        return new Promise(resolve =>
            setTimeout(() => {
                resolve({
                    make: 'Nissan',
                    model: 'Skyline GT-R',
                    year: '2001',
                })
            }, 1000)
        )
    }

    // Detect car details in image using cloud function
    const detectCar = async () => {
        if (!image) return
        setLoadingDetection(true)

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
            setLoadingDetection(false)
            setGeminiChecked(true)
        }
    }


    // Generate description
    const mockGenerateDescription = async (make: string, model: string, year: string) => {
        // return new Promise(resolve =>
        //     setTimeout(() => {
        //         resolve(
        //             `The ${year} ${make} ${model} combines performance, style, and engineering excellence in a timeless design.`
        //         )
        //     }, 1000)
        // )
        //return generateCarDescriptionWithGemini(make, model, year)
    }

    // Uses cloud function to generate description
    const generateDescription = async () => {
        if (!carDetails) return
        setLoadingDescription(true)
        // const result = await mockDetectCarDetails(image) // dummy data


        if (!user) {
            console.error('User is not authenticated.')
            return
        }
        // For sending request to backnend with authorisation:
        const token = user && (await user.getIdToken())

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
            setLoadingDescription(false)
        }
    }


    const savePosterMetadata = async (uid: string, imageUrl: string) => {
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

    // Generating poster (using httpsCallable)
    // const handleGeneratePoster = async () => {
    //     setLoading(true)
    //     try {
    //         const generatePoster = httpsCallable(functions, 'generatePoster')
    //         const result = await generatePoster({
    //             psdUrl: selectedTemplate?.psdFileUrl,
    //             userImageUrl: previewUrl, // Must be publicly accessible
    //             carDetails,
    //             description,
    //             instagramHandle: instagramHandle
    //         })
    //         const { imageUrl } = result.data as any
    //         setPosterUrl(imageUrl)
    //     } catch (err) {
    //         console.error(err)
    //         alert('Poster generation failed.')
    //     } finally {
    //         setLoading(false)
    //     }
    // }

    // For progress updates
    function listenToPosterProgress(jobId: string, onUpdate: (progress: string) => void) {
        const db = getFirestore();
        const jobRef = doc(db, "jobs", jobId);

        const unsubscribe = onSnapshot(jobRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                onUpdate(data.progress || "");

                if (data.status === "complete" || data.status === "error") {
                    unsubscribe();
                }
            }
        });

        return unsubscribe;
    }

    // Generating poster using fetch
    const handleGeneratePoster = async () => {

        if (!user) {
            console.error('User is not authenticated.')
            return
        }
        // For sending request to backnend with authorisation:
        const token = user && (await user.getIdToken())

        const jobId = crypto.randomUUID();

        setProgress("Starting...");
        const unsubscribe = listenToPosterProgress(jobId, (progress) => {
            setProgress(progress);
        });


        setLoading(true)
        try {
            const response = await fetch('https://us-central1-posterassistant-aebf0.cloudfunctions.net/generatePoster', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    psdUrl: selectedTemplate?.psdFileUrl,
                    userImageUrl: previewUrl, // Must be publicly accessible
                    carDetails,
                    description,
                    instagramHandle,
                    fontsUsed: selectedTemplate?.fontsUsed,
                    jobId
                })
            })

            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}`)
            }

            console.log("Response:", response)

            const { imageUrl } = await response.json()
            setPosterUrl(imageUrl)

            // ✅ Save to Firestore
            await savePosterMetadata(user.uid, imageUrl)
        } catch (err) {
            console.error('Poster generation failed:', err)
            alert('Poster generation failed.')
        } finally {
            unsubscribe();
            setLoading(false)
        }
    }





    return (
        <div className="p-8 max-w-xl mx-auto">

            <section id='templates'>
                <h1 className="text-2xl font-bold mb-4">Select a Template</h1>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {templates.map((template) => (
                        <TemplateCard
                            key={template.id}
                            id={template.id}
                            name={template.name}
                            createdBy={template.createdBy}
                            previewImageUrl={template.previewImageUrl}
                            fontsUsed={template.fontsUsed}
                            isSelected={selectedTemplate?.id === template.id}
                            onSelect={() => setSelectedTemplate(template)}
                            onToggleFavorite={() => toggleFavorite(template.id)}
                            isFavorite={favoriteTemplates.includes(template.id)}
                        />
                    ))}
                </div>
            </section>

            <section id='upload image'>
                <h1 className="text-2xl font-bold mb-4">Upload Your Image</h1>

                <input
                    id="imageInput"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="mb-4"
                />

                {previewUrl && (
                    <img src={previewUrl} alt="Preview" className="w-full rounded-xl shadow-lg" />
                )}
            </section>

            <section id='identify vehicle'>
                <button
                    disabled={!image || !selectedTemplate || loadingDetection}
                    onClick={detectCar}
                    className="mt-6 bg-blue-600 text-white px-4 py-2 rounded-md"
                >
                    {loadingDetection ? 'Detecting...' : 'Detect Car Info'}
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

            <section id='generate description'>
                <button
                    disabled={!carDetails.make || !carDetails.model || !carDetails.year || loadingDescription}
                    onClick={async () => {
                        generateDescription()
                    }}
                    className="mt-4 bg-green-600 text-white px-4 py-2 rounded-md"
                >
                    {loadingDescription ? 'Generating Description...' : 'Generate Description'}
                </button>

                {description && (
                    <div className="mt-4 p-4 border rounded-md bg-gray-600">
                        <h3 className="font-bold mb-2">Description:</h3>
                        <p>{description}</p>
                    </div>
                )}

            </section>


            <section id='generate poster'>
                <button
                    className="mt-6 bg-purple-600 text-white px-4 py-2 rounded-md"
                    disabled={!image || !selectedTemplate || !description || loading}
                    onClick={handleGeneratePoster}
                >
                    {loading ? 'Generating Poster...' : 'Generate Final Poster'}
                </button>
                {loading && (
                    <div className="text-center mt-4">
                        <Spinner />
                        <p className="mt-2 text-sm text-gray-500">{progress}</p>
                    </div>
                )}

                {posterUrl && (
                    <div className="mt-4">
                        <p className="font-semibold mb-2">Your poster is ready:</p>
                        <img src={posterUrl} alt="Poster preview" className="rounded shadow-md w-full max-w-md" />
                        <a
                            href={posterUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="mt-2 inline-block text-blue-600 underline"
                        >
                            Preview Poster
                        </a>
                    </div>
                )}


            </section>

        </div>
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
