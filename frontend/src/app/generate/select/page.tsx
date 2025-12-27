/* eslint-disable @typescript-eslint/no-unused-vars */


// This page is for selecting a template

'use client'

import { usePosterWizard, isStepAccessible } from '@/context/PosterWizardContext'
import { useAuth } from '@/context/AuthContext'
import { Template } from '@/types/template'
import { useState, useRef, useEffect } from 'react'
import { collection, getDocs, doc, updateDoc, arrayUnion, arrayRemove, getDoc, query, where } from 'firebase/firestore'
import { db } from '@/firebase/client'
import TemplateCard from '@/components/TemplateCard'
import { useRouter } from 'next/navigation';
import Spinner from '@/components/Spinner';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from "framer-motion";
import { Archivo_Black } from "next/font/google";
import TemplateKnob from '@/components/TemplateKnob'
import Notification from '@/components/Notification'
import { notify } from '@/utils/notify'
import TemplateSlider from '@/components/TemplateSlider'

const archivoBlack = Archivo_Black({
    weight: "400", // Archivo Black only has 400
    subsets: ["latin"],
});

export default function SelectTemplatePage() {
    const [templates, setTemplates] = useState<Template[]>([])
    const { selectedTemplate, setSelectedTemplate, setInstagramHandle, userImgThumbDownloadUrl, templateIndex, setTemplateIndex, setGeminiChecked, setCarDetails, credits, setCredits } = usePosterWizard()
    const { user } = useAuth()
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const [favoriteTemplates, setFavoriteTemplates] = useState<string[]>([])
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const { state } = usePosterWizard()

    const searchParams = useSearchParams();
    const imageUploaded_flag = searchParams!.get('upload') === 'true';

    const [index, setIndex] = useState(templateIndex);
    const [direction, setDirection] = useState(0); // -1 left, 1 right
    //const currentTemplate = templates[index];

    const STYLES = ["Brands", "Magazine", "Events", "Favourites"]
    const [selectedStyle, setSelectedStyle] = useState<string>("Brands")
    const filteredTemplates = templates.filter(t => {
        if (selectedStyle === "Favourites") {
            return favoriteTemplates.includes(t.id);
        }
        return t.style === selectedStyle;
    });

    const currentTemplate = filteredTemplates[index];

    const [showHeart, setShowHeart] = useState(false);
    const lastTap = useRef(0);

    useEffect(() => {
        setIndex(0);
    }, [selectedStyle, filteredTemplates.length]);

    const handleDoubleTap = () => {
        if (!currentTemplate) return;
        const now = Date.now();
        if (now - lastTap.current < 300) {
            const willFavorite = !favoriteTemplates.includes(currentTemplate.id); // true if adding
            toggleFavorite(currentTemplate.id);
            if (willFavorite) {
                setShowHeart(true);
                setTimeout(() => setShowHeart(false), 600);
            }
        }
        lastTap.current = now;
    };


    const isFavorite = currentTemplate
        ? favoriteTemplates.includes(currentTemplate.id)
        : false;

    const paginate = (newDirection: number) => {
        if (!filteredTemplates.length) return;
        const newIndex = (index + newDirection + filteredTemplates.length) % filteredTemplates.length;
        setDirection(newDirection);
        setIndex(newIndex);
        setSelectedTemplate(filteredTemplates[newIndex]);
    };



    useEffect(() => {
        if (!isStepAccessible('select', state)) {
            console.log('No image uploaded. Redirecting.')
            router.push('/generate/upload')
        }
    }, [state, router])

    const handleNext = () => {
        setSelectedTemplate(currentTemplate);
        // if (selectedTemplate === null) {
        //     alert('No template selected');
        //     return
        // } else {
        //     router.push('/generate/identify')
        // }

        if (selectedTemplate === null || selectedTemplate === undefined) {
            alert('No template selected');
            return
        } else {
            console.log(selectedStyle + ", " + selectedTemplate?.name);
            router.push('/generate/identify')
        }
        
        
    }

    const handleBack = () => {
        setCarDetails({ make: '', model: '', year: '' })
        setGeminiChecked(false)
        if (imageUploaded_flag) {
            router.push('/generate/upload?imageUploaded=true')
        }
        router.push('/generate/upload')
    }

    // useEffect(() => {
    //     if (!hasNotifiedRef.current) {
    //         if (credits.posterGen == null) {
    //             setTimeout(() => {
    //                 if (credits.posterGen != null) {
    //                     notify("info", `You have ${credits.posterGen} credits left.`);
    //                     hasNotifiedRef.current = true;
    //                 }
    //             }, 1000);
    //         } else {
    //             notify("info", `You have ${credits.posterGen} credits left.`);
    //             hasNotifiedRef.current = true;
    //         }
    //     }
    // }, [credits.posterGen])
    // const hasNotifiedRef = useRef(false);

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
            setCredits(data?.credits)
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
                <Notification />
                <div className="p-2 max-w-xl mx-auto pt-5">
                    <div className="border-3 border-blue-400 px-4 py-2 mb-9 flex flex-col items-center shadow-[0_0_14px_rgba(59,130,246,0.7)]">
                        <h1 className={`text-2xl text-gray-200 ${archivoBlack.className}`}>
                            Choose A Template
                        </h1>
                    </div>

                    <p className="text-sm text-gray-500 mx-auto">**Placeholder text only**</p>
                    <p className="text-sm text-gray-500 mx-auto mb-2">**Output will be higher quality**</p>

                    {/* WRAPPER for double-tap (no drag here) */}
                    <div
                        className="relative flex flex-col items-center w-full"
                        onClick={handleDoubleTap}
                    >
                        <div className="relative w-full max-w-[600px] aspect-[3/4] rounded-md overflow-hidden shadow-lg">
                            {/* User's uploaded image — STATIC */}
                            {userImgThumbDownloadUrl && (
                                <img
                                    src={userImgThumbDownloadUrl}
                                    alt="Preview"
                                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                                />
                            )}

                            {/* Template overlay — SWIPE ENABLED */}
                            <AnimatePresence initial={false} custom={direction}>
                                <motion.img
                                    key={currentTemplate?.id}
                                    src={currentTemplate?.previewImageUrl}
                                    alt={currentTemplate?.name}
                                    className="absolute inset-0 w-full h-full object-cover"
                                    custom={direction}
                                    variants={{
                                        enter: (dir: number) => ({
                                            x: dir > 0 ? 300 : -300,
                                            opacity: 0,
                                        }),
                                        center: {
                                            x: 0,
                                            opacity: 1,
                                        },
                                        exit: (dir: number) => ({
                                            x: dir > 0 ? -300 : 300,
                                            opacity: 0,
                                        }),
                                    }}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{ duration: 0.4 }}
                                    draggable={false}
                                    drag="x"
                                    dragConstraints={{ left: 0, right: 0 }}
                                    dragElastic={0.6}
                                    onDragEnd={(e, { offset }) => {
                                        if (offset.x < -50) paginate(1)
                                        else if (offset.x > 50) paginate(-1)
                                    }}
                                />

                            </AnimatePresence>
                        </div>

                        {/* Template label */}
                        <div className="mt-6 mb-2 mx-auto text-center bg-black/60 text-white px-4 py-1 rounded-lg text-sm">
                            {currentTemplate?.name}
                        </div>
                    </div>


                    {/* <TemplateKnob
                        templates={filteredTemplates}
                        index={index}
                        paginate={paginate}
                    /> */}
                    {filteredTemplates.length > 0 ? (
                        <TemplateSlider
                            length={filteredTemplates.length}
                            index={index}
                            onSwipe={paginate}
                            selectedStyle={selectedStyle.toString()}
                        />
                    ) : selectedStyle === "Favourites" ? (
                        <div className="text-sm text-gray-400 text-center mt-2 mb-5">
                            No favourites. Double tap a template to favourite!
                        </div>
                    ) : <div className="text-sm text-gray-400 text-center mt-2 mb-5">
                        No templates here.
                    </div>}

                    <div className="flex overflow-x-auto snap-x gap-2 mt-2">
                        {STYLES.map(style => {
                            let className = style === selectedStyle ? "active" : "inactive";

                            // Override color for Favourites
                            if (style === "Favourites") {
                                className = style === selectedStyle
                                    ? "activeFavourite"
                                    : "inactiveFavourite";
                            }

                            return (
                                <button
                                    key={style}
                                    onClick={() => {
                                        setSelectedStyle(style);
                                        setSelectedTemplate(currentTemplate);
                                    }}
                                    className={className}
                                >
                                    {style}
                                </button>
                            );
                        })}
                    </div>



                    {/* Floating heart animation */}
                    <AnimatePresence>
                        {showHeart && (
                            <motion.div
                                key="heart"
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1.5, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="absolute text-red-500 text-3xl select-none pointer-events-none left-1/2"
                                style={{ bottom: '18rem', transform: 'translateX(-50%)' }}
                            >
                                ❤️
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Permanent toggle heart */}
                    {/* <div className="flex flex-col items-center w-full h-[2rem]">
                        {isFavorite && (
                            <button
                                onClick={() => currentTemplate && toggleFavorite(currentTemplate.id)}
                                className="opacity-70 text-2xl"
                            >
                                ❤️
                            </button>
                        )}
                    </div> */}
                </div>

                <div className="flex justify-between">
                    <button
                        onClick={handleBack}
                        className="self-start mt-6 relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-pink-500 to-orange-400 group-hover:from-pink-500 group-hover:to-orange-400 hover:text-white dark:text-white focus:ring-4 focus:outline-none focus:ring-pink-200 dark:focus:ring-pink-800"
                    >
                        <span className="relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-transparent group-hover:dark:bg-transparent">
                            Back
                        </span>
                    </button>

                    <button
                        onClick={handleNext}
                        className="self-end relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-purple-600 to-blue-500 group-hover:from-purple-600 group-hover:to-blue-500 hover:text-white dark:text-white focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800"
                    >
                        <span className="relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-transparent group-hover:dark:bg-transparent">
                            Next
                        </span>
                    </button>
                </div>
            </section>
        </motion.div>
    )


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
