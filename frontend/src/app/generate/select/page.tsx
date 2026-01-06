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
    const { selectedTemplate, setSelectedTemplate, setInstagramHandle, userImgThumbDownloadUrl, templateIndex, setTemplateIndex, setGeminiChecked, setCarDetails, credits, setCredits, hexValue, setHexValue } = usePosterWizard()
    const { user } = useAuth()
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const [favoriteTemplates, setFavoriteTemplates] = useState<string[]>([])
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const { state } = usePosterWizard()

    const [colorOpen, setColorOpen] = useState(false);

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

    //const containerRef = useRef<HTMLDivElement>(null);
    //const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const pickingRef = useRef(false);
    const containerRef = useRef<HTMLDivElement>(null);


    const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
    const baseImgRef = useRef<HTMLImageElement>(null);

    async function applyHexFillToOverlay(hex: string) {
        const canvas = overlayCanvasRef.current;
        if (!canvas || !selectedTemplate?.previewHexUrl) return;

        const baseImg = baseImgRef.current;
        if (!baseImg?.naturalWidth) return; // ensure base image is loaded

        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;

        // Set canvas to **match displayed size**
        canvas.width = baseImg.clientWidth;
        canvas.height = baseImg.clientHeight;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = selectedTemplate.previewHexUrl;

        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject();
        });

        // Draw the overlay PNG stretched to canvas
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Apply hex fill
        ctx.globalCompositeOperation = "source-atop";
        ctx.fillStyle = hex;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = "source-over";
    }


    useEffect(() => {
        const canvas = overlayCanvasRef.current;
        const baseImg = baseImgRef.current;
        const overlayUrl = selectedTemplate?.previewHexUrl;
        if (!canvas || !baseImg || !overlayUrl) return;

        const drawOverlay = async () => {
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            if (!ctx) return;

            // Set canvas size to match displayed base image
            canvas.width = baseImg.clientWidth;
            canvas.height = baseImg.clientHeight;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = overlayUrl;

            await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = () => reject();
            });

            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            ctx.globalCompositeOperation = "source-atop";
            ctx.fillStyle = hexValue;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalCompositeOperation = "source-over";
        };

        if (!baseImg.complete) {
            baseImg.onload = drawOverlay;
        } else {
            drawOverlay();
        }
    }, [hexValue, selectedTemplate?.previewHexUrl]);




    useEffect(() => {
        if (!canvasRef.current) return;

        ctxRef.current = canvasRef.current.getContext("2d", { willReadFrequently: true })!;
    }, []);


    // whenever user selects a color
    useEffect(() => {
        applyHexFillToOverlay(hexValue);
    }, [hexValue, selectedTemplate?.previewHexUrl]);


    useEffect(() => {
        function handleClickOutside(e: MouseEvent | TouchEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setColorOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("touchstart", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("touchstart", handleClickOutside);
        };
    }, [colorOpen]);




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

    //const canvasRef = useRef<HTMLCanvasElement>(null);


    useEffect(() => {
        if (!colorOpen || !canvasRef.current) return;

        const canvas = canvasRef.current;

        // Set actual pixel dimensions
        canvas.width = 300;
        canvas.height = 150;

        // Get context with willReadFrequently only once
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctxRef.current = ctx;

        // Horizontal hue gradient
        const hue = ctx.createLinearGradient(0, 0, canvas.width, 0);
        hue.addColorStop(0, "red");
        hue.addColorStop(0.17, "yellow");
        hue.addColorStop(0.33, "lime");
        hue.addColorStop(0.5, "cyan");
        hue.addColorStop(0.67, "blue");
        hue.addColorStop(0.83, "magenta");
        hue.addColorStop(1, "red");
        ctx.fillStyle = hue;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Vertical value/saturation overlay
        const value = ctx.createLinearGradient(0, 0, 0, canvas.height);
        value.addColorStop(0, "rgba(255,255,255,1)");
        value.addColorStop(0.5, "rgba(255,255,255,0)");
        value.addColorStop(1, "rgba(0,0,0,1)");
        ctx.fillStyle = value;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

    }, [colorOpen]);




    //const pickingRef = useRef(false);

    function pickColor(clientX: number, clientY: number) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const x = Math.max(0, Math.min(canvas.width - 1, clientX - rect.left));
        const y = Math.max(0, Math.min(canvas.height - 1, clientY - rect.top));

        const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
        const hex = ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
        setHexValue(`#${hex}`); // live update
    }

    function startPick(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
        pickingRef.current = true;

        if ("touches" in e) {
            pickColor(e.touches[0].clientX, e.touches[0].clientY);
            // attach only to this canvas
            const canvas = e.currentTarget as HTMLCanvasElement;
            canvas.addEventListener("touchmove", onTouchMove, { passive: false });
            canvas.addEventListener("touchend", stopPick);
        } else {
            pickColor(e.clientX, e.clientY);
            window.addEventListener("mousemove", onMove);
            window.addEventListener("mouseup", stopPick);
        }
    }

    function onTouchMove(e: TouchEvent) {
        if (!pickingRef.current) return;
        e.preventDefault(); // only blocks scroll when touching picker
        pickColor(e.touches[0].clientX, e.touches[0].clientY);
    }

    function stopPick() {
        pickingRef.current = false;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", stopPick);

        const canvas = canvasRef.current;
        if (canvas) {
            canvas.removeEventListener("touchmove", onTouchMove);
            canvas.removeEventListener("touchend", stopPick);
        }
    }



    function onMove(e: MouseEvent) {
        if (!pickingRef.current) return;
        pickColor(e.clientX, e.clientY);
    }







    const isFavorite = currentTemplate
        ? favoriteTemplates.includes(currentTemplate.id)
        : false;

    const paginate = (newDirection: number) => {
        if (!filteredTemplates.length) return;
        const newIndex = (index + newDirection + filteredTemplates.length) % filteredTemplates.length;
        setDirection(newDirection);
        setIndex(newIndex);
        //setSelectedTemplate(filteredTemplates[newIndex]);
        setHexValue('');
    };



    useEffect(() => {
        if (!isStepAccessible('select', state)) {
            console.log('No image uploaded. Redirecting.')
            router.push('/generate/upload')
        }
    }, [state, router])

    const handleNext = () => {
        //setSelectedTemplate(currentTemplate);
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

    useEffect(() => {
        if (!filteredTemplates.length) return;
        setSelectedTemplate(filteredTemplates[index]);
    }, [index, filteredTemplates, setSelectedTemplate]);


    const handleBack = () => {
        setHexValue('');
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
            <section id="select template" className="p-4 sm:p-6 md:p-8 mx-auto w-full max-w-3xl">
                <Notification />

                <div className="flex flex-col z-40 items-center mb-6 relative p-[4px] bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl">
                    <div className="flex flex-col items-center bg-white rounded-xl px-6 py-6 w-full">
                        <h1 className={`text-3xl sm:text-4xl md:text-5xl text-blue-400 text-center mb-2 ${archivoBlack.className}`}>
                            Choose A Template
                        </h1>
                        <p className="text-sm sm:text-base md:text-lg text-gray-700 text-center">
                            **Placeholder text only**
                        </p>
                    </div>
                </div>

                {/* Template Preview */}
                <div
                    className="relative flex flex-col items-center w-full max-w-xl mx-auto mb-6"
                >


                    <div className="relative z-40 w-full max-w-xs mx-auto rounded-sm overflow-hidden">
                        {/* Base image */}
                        {userImgThumbDownloadUrl && (
                            <img
                                ref={baseImgRef}
                                src={userImgThumbDownloadUrl}
                                alt="Base"
                                className="w-full h-auto block pointer-events-none"
                            />
                        )}

                        {/* Template overlay image */}
                        {currentTemplate?.previewImageUrl && (
                            <AnimatePresence initial={false} custom={direction}>
                                <motion.img
                                    key={currentTemplate?.id}
                                    src={currentTemplate?.previewImageUrl}
                                    alt={currentTemplate?.name}
                                    className="absolute inset-0 w-full h-full object-cover"
                                    custom={direction}
                                    variants={{
                                        enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
                                        center: { x: 0, opacity: 1 },
                                        exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
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

                        )}

                        {/* Colorable overlay */}
                        {selectedTemplate?.previewHexUrl && hexValue !== "" && (
                            <canvas
                                ref={overlayCanvasRef}
                                className="absolute top-0 left-0 w-full h-full pointer-events-none z-20"
                            />
                        )}
                    </div>



                    {/* Template label */}
                    <div className="mt-6 mx-auto grid grid-cols-3 items-center bg-black/80 text-white px-4 py-1 rounded-lg text-sm max-w-md">
                        {/* Left: color picker box */}
                        {selectedTemplate?.hexElements != null ? (
                            <div className="flex justify-center relative">
                                <div
                                    className="h-7 w-7 border rounded cursor-pointer"
                                    style={{ backgroundColor: hexValue }}
                                    onClick={() => setColorOpen((v) => !v)}
                                />
                            </div>

                        ) : (
                            <div className="flex justify-center"></div>
                        )}


                        {/* Center: template name */}
                        <div className="text-center flex items-center justify-center h-8">
                            {currentTemplate?.name}
                        </div>

                        {/* Right: disabled / invisible box */}
                        <div className="flex justify-center">
                            {selectedTemplate?.hexElements != null && hexValue !== "" ? (
                                <img src="/svg/xmark_gray.svg" alt="Close" className="relative w-6 h-6 cursor-pointer" onClick={() => setHexValue("")} />
                            ) : (
                                <div className="h-8 w-8 border border-white rounded opacity-0 pointer-events-none" />
                            )}

                        </div>
                    </div>




                </div>

                {/* Custom spectrum popup */}
                <div className="flex justify-center relative" ref={containerRef}>
                    {/* Trigger square */}

                    {/* Color picker popup */}
                    {/* Custom spectrum popup wrapper */}
                    <div className="flex justify-center relative" ref={containerRef}>
                        {/* Only render the popup if open */}

                        <div
                            className={`
    fixed inset-x-0 bottom-0
    bg-white/60 backdrop-blur-xs
    z-30
    transition-opacity duration-300 top-[0px]
    ${colorOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
  `}
                            onClick={() => setColorOpen(false)}
                        />


                        <div
                            className={`absolute left-1/2 -top-20 transform -translate-x-1/2 z-50 p-1 bg-black/90 rounded mt-2 w-[90vw] max-w-[320px]
h-[120px] sm:h-[140px] md:h-[160px]
sm:mx-4
md:mx-0
transition-all duration-300 ease-out
${colorOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}`}
                            onClick={(e) => e.stopPropagation()}
                        >

                            <canvas
                                ref={canvasRef}
                                width={300}
                                height={150}
                                className="cursor-crosshair w-full h-full"
                                onMouseDown={startPick}
                                onTouchStart={startPick}
                            />
                        </div>

                    </div>


                </div>



                {/* Template Styles Slider */}
                {filteredTemplates.length > 0 ? (
                    <TemplateSlider
                        length={filteredTemplates.length}
                        index={index}
                        onSwipe={paginate}
                        selectedStyle={selectedStyle.toString()}
                    />
                ) : (
                    <div className="text-sm text-gray-400 text-center mt-2 mb-5">
                        {selectedStyle === "Favourites" ? "No favourites. Double tap a template to favourite!" : "No templates here."}
                    </div>
                )}

                <div className="flex flex-wrap justify-center gap-2 mt-2 mb-6">
                    {STYLES.map((style) => {
                        let className = style === selectedStyle ? "active" : "inactive";
                        if (style === "Favourites") {
                            className = style === selectedStyle ? "activeFavourite" : "inactiveFavourite";
                        }
                        return (
                            <button
                                key={style}
                                onClick={() => {
                                    setHexValue('');
                                    setSelectedStyle(style);
                                    setSelectedTemplate(null);
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

                {/* Navigation Buttons */}
                <div className="flex justify-center gap-4 mt-8">
                    <button
                        onClick={handleBack}
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
