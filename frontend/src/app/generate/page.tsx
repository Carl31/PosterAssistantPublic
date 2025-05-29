/* eslint-disable @typescript-eslint/no-explicit-any */
// This is the main entry point for poster creation.

'use client'

import { useAuth } from '@/context/AuthContext'
import { useState, useEffect } from 'react'
import { collection, getDocs, doc, updateDoc, arrayUnion, arrayRemove, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase/client'
import TemplateCard from '@/components/TemplateCard'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { auth } from '@/firebase/client'

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

    // For generating description of vehicle
    const [description, setDescription] = useState('')
    const [loadingDescription, setLoadingDescription] = useState(false)

    // For generating poster
    const [loading, setLoading] = useState(false)
    const [posterUrl, setPosterUrl] = useState<string | null>(null)




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

    // For uploading user image to Firestore (for Photopea to access later) and setting it in the UI

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        const user = auth.currentUser

        if (!file || !user) return

        setImage(file) // Optional: keep original for crop/edit later

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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

    // Detect car image before identifying
    const detectCar = async () => {
        if (!image) return
        setLoadingDetection(true)
        const result = await mockDetectCarDetails(image)
        setCarDetails(result as any)
        setLoadingDetection(false)
    }


    // Generate description
    const mockGenerateDescription = async (make: string, model: string, year: string) => {
        return new Promise(resolve =>
            setTimeout(() => {
                resolve(
                    `The ${year} ${make} ${model} combines performance, style, and engineering excellence in a timeless design.`
                )
            }, 1000)
        )
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

    // Generating poster using fetch
    const handleGeneratePoster = async () => {
        if (!user) return

        setLoading(true)
        try {
            const response = await fetch('https://us-central1-posterassistant-aebf0.cloudfunctions.net/generatePoster', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    psdUrl: selectedTemplate?.psdFileUrl,
                    userImageUrl: previewUrl, // Must be publicly accessible
                    carDetails,
                    description,
                    instagramHandle
                })
            })

            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}`)
            }

            const { imageUrl } = await response.json()
            setPosterUrl(imageUrl)

            // ✅ Save to Firestore
            await savePosterMetadata(user.uid, imageUrl)
        } catch (err) {
            console.error('Poster generation failed:', err)
            alert('Poster generation failed.')
        } finally {
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
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="mb-4"
                />

                {previewUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
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

                {carDetails.make && (
                    <div className="mt-4 space-y-2">
                        <label className="block">Make</label>
                        <input
                            value={carDetails.make}
                            onChange={(e) => setCarDetails({ ...carDetails, make: e.target.value })}
                            className="border p-2 w-full"
                        />
                        <label className="block">Model</label>
                        <input
                            value={carDetails.model}
                            onChange={(e) => setCarDetails({ ...carDetails, model: e.target.value })}
                            className="border p-2 w-full"
                        />
                        <label className="block">Year</label>
                        <input
                            value={carDetails.year}
                            onChange={(e) => setCarDetails({ ...carDetails, year: e.target.value })}
                            className="border p-2 w-full"
                        />
                    </div>
                )}

            </section>

            <section id='generate description'>
                <button
                    disabled={!carDetails.make || !carDetails.model || !carDetails.year || loadingDescription}
                    onClick={async () => {
                        setLoadingDescription(true)
                        const desc = await mockGenerateDescription(carDetails.make, carDetails.model, carDetails.year)
                        setDescription(desc as string)
                        setLoadingDescription(false)
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
                            Download Poster
                        </a>
                    </div>
                )}


            </section>

        </div>
    )
}
