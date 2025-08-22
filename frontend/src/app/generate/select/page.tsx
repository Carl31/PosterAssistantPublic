/* eslint-disable @typescript-eslint/no-unused-vars */


// This page is for selecting a template

'use client'

import { usePosterWizard, isStepAccessible } from '@/context/PosterWizardContext'
import { useAuth } from '@/context/AuthContext'
import { Template } from '@/types/template'
import { useState, useEffect } from 'react'
import { collection, getDocs, doc, updateDoc, arrayUnion, arrayRemove, getDoc, query, where } from 'firebase/firestore'
import { db } from '@/firebase/client'
import TemplateCard from '@/components/TemplateCard'
import { useRouter } from 'next/navigation';
import Spinner from '@/components/Spinner';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from "framer-motion";
import { Archivo_Black } from "next/font/google";

const archivoBlack = Archivo_Black({
    weight: "400", // Archivo Black only has 400
    subsets: ["latin"],
});

export default function SelectTemplatePage() {
    const [templates, setTemplates] = useState<Template[]>([])
    const { selectedTemplate, setSelectedTemplate, setInstagramHandle, userImgDownloadUrl, templateIndex, setTemplateIndex, setGeminiChecked, setCarDetails } = usePosterWizard()
    const { user } = useAuth()
    const [favoriteTemplates, setFavoriteTemplates] = useState<string[]>([])
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const { state } = usePosterWizard()

    const searchParams = useSearchParams();
    const imageUploaded_flag = searchParams!.get('upload') === 'true';

    const [index, setIndex] = useState(templateIndex);
    const [direction, setDirection] = useState(0); // -1 left, 1 right
    const currentTemplate = templates[index];

    const paginate = (newDirection: number) => {
        setDirection(newDirection);
        setIndex((prev) =>
            (prev + newDirection + templates.length) % templates.length
        );
        setSelectedTemplate(templates[index]);
    };



    useEffect(() => {
        if (!isStepAccessible('select', state)) {
            console.log('No image uploaded. Redirecting.')
            router.push('/generate/upload')
        }
    }, [state, router])

    const handleNext = () => {
        setTemplateIndex(index)
        setSelectedTemplate(templates[index]);
        // if (selectedTemplate === null) {
        //     alert('No template selected');
        //     return
        // } else {
        //     router.push('/generate/identify')
        // }
        router.push('/generate/identify')
    }

    const handleBack = () => {
        setCarDetails({ make: '', model: '', year: '' })
        setGeminiChecked(false)
        if (imageUploaded_flag) {
            router.push('/generate/upload?imageUploaded=true')
        }
        router.push('/generate/upload')
    }

    // Load all templates
    useEffect(() => {
        const fetchTemplates = async () => {
            setLoading(true)
            const snapshot = await getDocs(query(collection(db, 'templates'), where('isActive', '==', true)));
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Template))
            setTemplates(data)
            setLoading(false)
        }
        fetchTemplates()

        setIndex(templateIndex)
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user])

    // Toggle favorite
    const toggleFavorite = async (templateId: string) => {
        if (!user) return
        const userRef = doc(db, 'users', user.uid)
        const isFav = favoriteTemplates.includes(templateId)

        // Optimistically update the UI
        setFavoriteTemplates((prev) =>
            isFav ? prev.filter((id) => id !== templateId) : [...prev, templateId]
        )

        // 🔄 Firestore update runs in background
        try {
            await updateDoc(userRef, {
                'settings.favouriteTemplates': isFav
                    ? arrayRemove(templateId)
                    : arrayUnion(templateId)
            })
        } catch (err) {
            console.error('Failed to update favorite:', err)

            // Optional: Roll back if error occurs
            setFavoriteTemplates((prev) =>
                isFav ? [...prev, templateId] : prev.filter((id) => id !== templateId)
            )
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
        >
            <section id="select template" className="">
                <div className="p-2 max-w-xl mx-auto pt-5">
                    <div className="border-3 border-blue-400 px-4 py-2 mb-9 flex flex-col items-center shadow-[0_0_14px_rgba(59,130,246,0.7)]">
                        <h1 className={`text-2xl text-gray-200 ${archivoBlack.className}`}>
                            Choose A Template
                        </h1>
                    </div>

                    <p className='text-sm text-gray-500 mx-auto mb-2'>**Placehonder text only**</p>

                    <div className="relative w-full max-w-[600px] aspect-[3/4] rounded-md overflow-hidden shadow-lg">
                        {/* User's uploaded image */}
                        {userImgDownloadUrl && (
                            <img
                                src={userImgDownloadUrl}
                                alt="Preview"
                                className="absolute inset-0 w-full h-full object-cover"
                            />
                        )}

                        {/* Template overlay, swipeable */}
                        <AnimatePresence initial={false} custom={direction}>
                            <motion.img
                                key={currentTemplate?.id}
                                src={currentTemplate?.previewImageUrl}
                                alt={currentTemplate?.name}
                                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                                custom={direction}
                                initial={{ x: direction > 0 ? 300 : -300, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: direction > 0 ? -300 : 300, opacity: 0 }}
                                transition={{ duration: 0.4 }}
                                drag="x"
                                dragConstraints={{ left: 0, right: 0 }}
                                dragElastic={0.6}
                                onDragEnd={(e, { offset, velocity }) => {
                                    const swipe = offset.x * velocity.x;

                                    if (swipe < -1000) {
                                        // Swipe left → next template
                                        paginate(1);
                                    } else if (swipe > 1000) {
                                        // Swipe right → previous template
                                        paginate(-1);
                                    }
                                }}
                            />
                        </AnimatePresence>
                    </div>

                    {/* Navigation controls */}
                    <div className="absolute inset-0 flex justify-between items-center px-4">
                        <button
                            onClick={() => paginate(-1)}
                            className="bg-white/70 hover:bg-white text-blue-700 rounded-full p-3 shadow-lg"
                        >
                            ←
                        </button>
                        <button
                            onClick={() => paginate(1)}
                            className="bg-white/70 hover:bg-white text-blue-700 rounded-full p-3 shadow-lg"
                        >
                            →
                        </button>
                    </div>

                    {/* Template label */}
                    <div className="mt-6 mx-auto text-center bg-black/60 text-white px-4 py-1 rounded-lg text-sm">
                        {currentTemplate?.name}
                    </div>
                </div>

                <div className="mt-5 flex justify-between">
                    <button onClick={handleBack} className="self-start mt-6 relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-pink-500 to-orange-400 group-hover:from-pink-500 group-hover:to-orange-400 hover:text-white dark:text-white focus:ring-4 focus:outline-none focus:ring-pink-200 dark:focus:ring-pink-800">
                        <span className="relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-transparent group-hover:dark:bg-transparent">
                            Back
                        </span>
                    </button>

                    <button onClick={handleNext} className="self-end relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-purple-600 to-blue-500 group-hover:from-purple-600 group-hover:to-blue-500 hover:text-white dark:text-white focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800">
                        <span className="relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-transparent group-hover:dark:bg-transparent">
                            Next
                        </span>
                    </button>
                </div>

            </section>
        </motion.div>
    );

    // return (
    //     <motion.div
    //         initial={{ opacity: 0, y: 10 }}
    //         animate={{ opacity: 1, y: 0 }}
    //         exit={{ opacity: 0, y: -10 }}
    //         transition={{ duration: 0.3 }}
    //     >
    //         <div className="p-2 max-w-xl mx-auto">

    //             <section id='templates'>
    //                 <h1 className="text-2xl font-bold mb-4">Select a Template</h1>
    //                 {loading ? <Spinner /> : (
    //                     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
    //                         {templates.map((template) => (
    //                             <TemplateCard
    //                                 key={template.id}
    //                                 id={template.id}
    //                                 name={template.name}
    //                                 createdBy={template.createdBy}
    //                                 previewImageUrl={template.previewImageUrl}
    //                                 fontsUsed={template.fontsUsed}
    //                                 isSelected={selectedTemplate?.id === template.id}
    //                                 onSelect={() => setSelectedTemplate(template)}
    //                                 onToggleFavorite={() => toggleFavorite(template.id)}
    //                                 isFavorite={favoriteTemplates.includes(template.id)}
    //                             />
    //                         ))}
    //                     </div>
    //                 )}
    //             </section>

    //             <button onClick={handleBack} className="mt-6 relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-pink-500 to-orange-400 group-hover:from-pink-500 group-hover:to-orange-400 hover:text-white dark:text-white focus:ring-4 focus:outline-none focus:ring-pink-200 dark:focus:ring-pink-800">
    //                 <span className="relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-transparent group-hover:dark:bg-transparent">
    //                     Back
    //                 </span>
    //             </button>

    //             <button onClick={handleNext} className="relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-purple-600 to-blue-500 group-hover:from-purple-600 group-hover:to-blue-500 hover:text-white dark:text-white focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800">
    //                 <span className="relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-transparent group-hover:dark:bg-transparent">
    //                     Next
    //                 </span>
    //             </button>
    //         </div>
    //     </motion.div>
    // )
}
