/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */


// This page is for selecting a template

'use client'

import { usePosterWizard, isStepAccessible } from '@/context/PosterWizardContext'
import { useAuth } from '@/context/AuthContext'
import { auth } from '@/firebase/client'
import { Template } from '@/types/template'
import { useState, useRef, useEffect } from 'react'
import { collection, getDocs, doc, updateDoc, arrayUnion, arrayRemove, getDoc, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '@/firebase/client'
import TemplateCard from '@/components/TemplateCard'
import { useRouter } from 'next/navigation';
import Spinner from '@/components/Spinner';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from "framer-motion";
import { useGesture, PinchState } from '@use-gesture/react'
import { Archivo_Black } from "next/font/google";
import TemplateKnob from '@/components/TemplateKnob'
import Notification from '@/components/Notification'
import { notify } from '@/utils/notify'
import TemplateSlider from '@/components/TemplateSlider'
import { style } from 'framer-motion/client'
import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL,
    listAll,
} from 'firebase/storage'
import ErrorPage from '@/components/ErrorPage';
import LoadingPage from '@/components/LoadingPage'

const archivoBlack = Archivo_Black({
    weight: "400", // Archivo Black only has 400
    subsets: ["latin"],
});

export default function SelectTemplatePage() {
    const [templates, setTemplates] = useState<Template[]>([])
    const { selectedTemplate, setSelectedTemplate, setInstagramHandle, setUserPosterImgDownloadUrl, userPosterImgDownloadUrl, userImgDownloadUrl, templateIndex, setTemplateIndex, setGeminiChecked, setCarDetails, credits, setCredits, hexValue, setHexValue, accentHexValue, setAccentHexValue, alignChosen, setAlignChosen, savedPosition, setSavedPosition, savedScale, setSavedScale, savedRotation, setSavedRotation, setIsSupporter, isSupporter, setHasPackUnlocks, hasPackUnlocks, state } = usePosterWizard()
    const { user } = useAuth()
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const [favoriteTemplates, setFavoriteTemplates] = useState<string[]>([])
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const [colorOpen, setColorOpen] = useState(false);
    const [colorPickerMode, setColorPickerMode] = useState<'primary' | 'accent'>('primary');
    const [pickerHue, setPickerHue] = useState(0);   // 0 = white, 1–360 = hue
    const [pickerLightness, setPickerLightness] = useState(50);  // 0 = black, 50 = vivid, 100 = white


    const [showAdvanced, setShowAdvanced] = useState(false);

    const searchParams = useSearchParams();
    const imageUploaded_flag = searchParams!.get('upload') === 'true';

    const [index, setIndex] = useState(templateIndex);
    const [direction, setDirection] = useState(0); // -1 left, 1 right
    //const currentTemplate = templates[index];



    type SupporterState = {
        isActive: boolean
        expiresAt: Date | null
    }





    const STYLES = ["Basic", "Pro", "Designer", "Brands", "Favourites"]
    const [selectedStyle, setSelectedStyle] = useState<string>("Basic")
    const filteredTemplates = templates.filter(t => {
        if (selectedStyle === "Favourites") {
            return favoriteTemplates.includes(t.id);
        }
        return t.style === selectedStyle;
    });

    const currentTemplate = filteredTemplates[index];

    const [showHeart, setShowHeart] = useState(false);
    const lastTap = useRef(0);
    const tapTimeout = useRef<NodeJS.Timeout | null>(null);

    const [showMagazinePopup, setShowMagazinePopup] = useState(false);
    const [showBrandsPopup, setShowBrandsPopup] = useState(false);
    const [dontShowAgainMagazine, setDontShowAgainMagazine] = useState(false);
    const [dontShowAgainBrands, setDontShowAgainBrands] = useState(false);

    const [position, setPosition] = useState(savedPosition ?? { x: 0, y: 0 });
    const [scale, setScale] = useState(savedScale ?? 1);
    const [rotation, setRotation] = useState(savedRotation ?? 0);


    const [editMode, setEditMode] = useState(false);

    const [isAnimating, setIsAnimating] = useState(false);




    //const containerRef = useRef<HTMLDivElement>(null);
    //const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const containerRefForImage = useRef<HTMLDivElement>(null);


    const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
    const accentOverlayCanvasRef = useRef<HTMLCanvasElement>(null);
    const baseImgRef = useRef<HTMLImageElement>(null);

    const previewImgCacheRef = useRef<Record<string, HTMLImageElement>>({});
    const overlayImgCacheRef = useRef<Record<string, HTMLImageElement>>({});
    const accentOverlayImgCacheRef = useRef<Record<string, HTMLImageElement>>({});

    const storage = getStorage()

    const [error, setError] = useState<string | null>(null)

    const tapStart = useRef<{ x: number; y: number } | null>(null);
    const TAP_THRESHOLD = 5; // px, adjust if needed


    const defaultAlign = selectedTemplate?.alignDefault;
    const isReversed =
        selectedTemplate?.alignSelect &&
        alignChosen != null &&
        defaultAlign != null &&
        alignChosen !== defaultAlign;

    const previewImageUrl = isReversed
        ? currentTemplate?.previewImageReverseUrl
        : currentTemplate?.previewImageUrl;

    const previewHexUrl = isReversed
        ? selectedTemplate?.previewHexReverseUrl
        : selectedTemplate?.previewHexUrl;

    const previewHexAccentUrl = isReversed
        ? selectedTemplate?.previewHexAccentReverseUrl
        : selectedTemplate?.previewHexAccentUrl;



    const scrollByDrag = (my: number) => {
        // Positive `my` → dragging down → scroll up
        // Negative `my` → dragging up → scroll down
        const scrollAmount = 200; // pixels per drag
        window.scrollBy({ top: -Math.sign(my) * scrollAmount, behavior: 'smooth' });
    };

    const bind = useGesture(
        {
            onDrag: ({ offset: [x, y], movement: [mx, my], last, event }) => {
                if (!editMode) {
                    if (Math.abs(mx) > 50) paginate(mx > 0 ? -1 : 1);
                    if (Math.abs(my) > 50) scrollByDrag(my); // small threshold to prevent accidental scroll
                    return;
                }

                setPosition({ x, y });

                if (Math.abs(mx) > Math.abs(my)) event?.preventDefault();
            },

            onPinch: ({ offset: [d, a] }) => {
                if (!editMode) return;
                setScale(d);
                setRotation(a);
            },

            onPointerDown: ({ event }) => {
                // console.log(selectedTemplate);
                if (colorOpen) return;

                const pointerEvent = event as PointerEvent;
                tapStart.current = { x: pointerEvent.clientX, y: pointerEvent.clientY };
            },

            onPointerUp: ({ event }) => {
                if (colorOpen) return;

                const pointerEvent = event as PointerEvent;

                if (!tapStart.current) return;

                const dx = Math.abs(pointerEvent.clientX - tapStart.current.x);
                const dy = Math.abs(pointerEvent.clientY - tapStart.current.y);

                tapStart.current = null;

                if (dx <= TAP_THRESHOLD && dy <= TAP_THRESHOLD) {
                    handleTap(event as any); // treat as tap
                }
            },
        },
        {
            drag: { from: () => [position.x, position.y], filterTaps: true },
            pinch: { scaleBounds: { min: 0.5, max: 3 }, rubberband: false },
            eventOptions: { passive: false },
        }
    );


    const handleCloseMagazinePopup = async () => {
        setShowMagazinePopup(false);

        if (dontShowAgainMagazine && user?.uid) {
            await updateDoc(doc(db, "users", user.uid), {
                "settings.hideMagazinePopup": true,
            });
        }

    };

    const handleCloseBrandsPopup = async () => {
        setShowBrandsPopup(false);

        if (dontShowAgainBrands && user?.uid) {
            await updateDoc(doc(db, "users", user.uid), {
                "settings.hideBrandsPopup": true,
            });
        }

    };

    // ── Eagerly pre-load all orientations when template changes ───────────────
    useEffect(() => {
        const urls = [
            selectedTemplate?.previewHexUrl,
            selectedTemplate?.previewHexReverseUrl,
        ].filter(Boolean) as string[];

        urls.forEach((url) => {
            if (overlayImgCacheRef.current[url]) return;
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = url;
            img.onload = () => { overlayImgCacheRef.current[url] = img; };
        });
    }, [selectedTemplate?.id]);

    useEffect(() => {
        const urls = [
            selectedTemplate?.previewHexAccentUrl,
            selectedTemplate?.previewHexAccentReverseUrl,
        ].filter(Boolean) as string[];

        urls.forEach((url) => {
            if (accentOverlayImgCacheRef.current[url]) return;
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = url;
            img.onload = () => { accentOverlayImgCacheRef.current[url] = img; };
        });
    }, [selectedTemplate?.id]);

    // ── Repaint when alignment changes (reads from cache, zero network) ───────
    useEffect(() => {
        if (!previewHexUrl) return;

        const paint = (img: HTMLImageElement) => {
            const canvas = overlayCanvasRef.current;
            const baseImg = baseImgRef.current;
            if (!canvas || !baseImg) return;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            if (!ctx) return;
            canvas.width = baseImg.clientWidth;
            canvas.height = baseImg.clientHeight;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            ctx.globalCompositeOperation = "source-atop";
            ctx.fillStyle = hexValue;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalCompositeOperation = "source-over";
        };

        const cached = overlayImgCacheRef.current[previewHexUrl];
        if (cached) { paint(cached); return; }

        // Fallback: not yet cached (e.g. very first load) — fetch once then cache
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = previewHexUrl;
        img.onload = () => { overlayImgCacheRef.current[previewHexUrl] = img; paint(img); };
    }, [previewHexUrl]);

    useEffect(() => {
        if (!previewHexAccentUrl) return;

        const paint = (img: HTMLImageElement) => {
            const canvas = accentOverlayCanvasRef.current;
            const baseImg = baseImgRef.current;
            if (!canvas || !baseImg) return;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            if (!ctx) return;
            canvas.width = baseImg.clientWidth;
            canvas.height = baseImg.clientHeight;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            ctx.globalCompositeOperation = "source-atop";
            ctx.fillStyle = accentHexValue;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalCompositeOperation = "source-over";
        };

        const cached = accentOverlayImgCacheRef.current[previewHexAccentUrl];
        if (cached) { paint(cached); return; }

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = previewHexAccentUrl;
        img.onload = () => { accentOverlayImgCacheRef.current[previewHexAccentUrl] = img; paint(img); };
    }, [previewHexAccentUrl]);


    // ── Eagerly pre-load both preview image orientations when template changes ─
    useEffect(() => {
        const urls = [
            currentTemplate?.previewImageUrl,
            currentTemplate?.previewImageReverseUrl,
        ].filter(Boolean) as string[];
        //console.log("preloading", urls)

        urls.forEach((url) => {
            if (previewImgCacheRef.current[url]) return; // already cached
            const img = new Image();
            img.onload = () => { previewImgCacheRef.current[url] = img; };
            img.src = url;
        });
    }, [currentTemplate?.id]);

    useEffect(() => {
        if (!canvasRef.current) return;

        ctxRef.current = canvasRef.current.getContext("2d", { willReadFrequently: true })!;
    }, []);


    useEffect(() => {
        if (savedPosition) setPosition(savedPosition);
        if (savedScale) setScale(savedScale);
        if (savedRotation) setRotation(savedRotation);
    }, [savedPosition, savedScale, savedRotation]);


    // ── Repaint colour only — zero network calls ──────────────────────────────
    useEffect(() => {
        const canvas = overlayCanvasRef.current;
        const img = previewHexUrl ? overlayImgCacheRef.current[previewHexUrl] : null;
        const baseImg = baseImgRef.current;
        if (!canvas || !img || !baseImg || !hexValue) return;

        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        canvas.width = baseImg.clientWidth;
        canvas.height = baseImg.clientHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = "source-atop";
        ctx.fillStyle = hexValue;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = "source-over";
    }, [hexValue]); // ← hex only — no fetch, no Image(), just canvas ops

    useEffect(() => {
        const canvas = accentOverlayCanvasRef.current;
        const img = previewHexAccentUrl ? accentOverlayImgCacheRef.current[previewHexAccentUrl] : null;
        const baseImg = baseImgRef.current;
        if (!canvas || !img || !baseImg || accentHexValue == null) return;

        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        canvas.width = baseImg.clientWidth;
        canvas.height = baseImg.clientHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = "source-atop";
        ctx.fillStyle = accentHexValue;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = "source-over";
    }, [accentHexValue]); // ← hex only

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
        if (colorOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [colorOpen]);


    useEffect(() => {
        setIndex(0);
    }, [selectedStyle, filteredTemplates.length]);

    const handleTap = (event?: Event) => {
        if (colorOpen) return; // prevent toggling if picker is open

        const now = Date.now();

        // DOUBLE TAP
        if (now - lastTap.current < 300) {
            if (tapTimeout.current) {
                clearTimeout(tapTimeout.current);
                tapTimeout.current = null;
            }

            if (!currentTemplate) return;

            const willFavorite = !favoriteTemplates.includes(currentTemplate.id);
            toggleFavorite(currentTemplate.id);

            if (willFavorite) {
                notify('info', `Added ${currentTemplate.name} to favorites.`);
                setShowHeart(true);
                setTimeout(() => setShowHeart(false), 600);
            } else {
                notify('info', `Removed ${currentTemplate.name} from favorites.`);
            }

            lastTap.current = 0;
            return;
        }

        // SINGLE TAP
        lastTap.current = now;

        tapTimeout.current = setTimeout(() => {
            setEditMode((v) => !v);
            tapTimeout.current = null;
        }, 300);
    };


    //const canvasRef = useRef<HTMLCanvasElement>(null);


    // Syncs sliders to the current active colour each time the picker opens.
    useEffect(() => {
        if (!colorOpen) return;
        const current = colorPickerMode === "primary" ? hexValue : accentHexValue;
        if (!current || current.length < 7) return;
        const [h, s, l] = hexToHsl(current);
        setPickerHue(s < 10 ? 0 : h); // near-grey → treat as white side
        setPickerLightness(l);
    }, [colorOpen, colorPickerMode]);


    function hslToHex(h: number, s: number, l: number): string {
        l /= 100;
        const a = (s / 100) * Math.min(l, 1 - l);
        const f = (n: number) => {
            const k = (n + h / 30) % 12;
            const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
            return Math.round(255 * color).toString(16).padStart(2, "0");
        };
        return `#${f(0)}${f(8)}${f(4)}`;
    }

    function hexToHsl(hex: string): [number, number, number] {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        const l = (max + min) / 2;
        if (max === min) return [0, 0, Math.round(l * 100)];
        const d = max - min;
        const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        let h = 0;
        if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        else if (max === g) h = ((b - r) / d + 2) / 6;
        else h = ((r - g) / d + 4) / 6;
        return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
    }

    function applyPickerColor(hue: number, lightness: number) {
        const hex = hslToHex(hue, hue === 0 ? 0 : 100, lightness);
        if (colorPickerMode === "primary") setHexValue(hex);
        else setAccentHexValue(hex);
    }

    const paginate = (newDirection: number) => {
        if (isAnimating) return;   // block if already animating
        setIsAnimating(true);      // mark animation in progress
        if (!filteredTemplates.length) return;
        const newIndex = (index + newDirection + filteredTemplates.length) % filteredTemplates.length;
        setDirection(newDirection);
        setIndex(newIndex);
        //setSelectedTemplate(filteredTemplates[newIndex]);
        setHexValue('');
        setAccentHexValue('');
        setAlignChosen(null);
    };



    useEffect(() => {
        if (!isStepAccessible('select', state)) {
            console.log('No image uploaded. Redirecting.')
            router.push('/generate/upload')
        }
    }, [state, router])

    const captureUserImage = async (
        containerRef: React.RefObject<HTMLDivElement | null>,
        imgRef: React.RefObject<HTMLImageElement | null>,
        position: { x: number; y: number },
        scale: number,
        rotation: number
    ): Promise<Blob> => {
        const container = containerRef.current;
        const img = imgRef.current;

        if (!container || !img) {
            throw new Error("Refs not ready");
        }

        if (!img.complete || !img.naturalWidth || !img.naturalHeight) {
            throw new Error("Image not loaded");
        }

        await new Promise(requestAnimationFrame);

        const rect = container.getBoundingClientRect();
        if (!rect.width || !rect.height) {
            throw new Error("Container has zero size");
        }

        // Quality multiplier (2 = recommended)
        const QUALITY = 2;

        // Base object-contain scale (matches CSS)
        const scaleX = rect.width / img.naturalWidth;
        const scaleY = rect.height / img.naturalHeight;
        const baseScale = Math.min(scaleX, scaleY);

        // Final export scale
        const exportScale = baseScale * scale;

        // Compute export canvas size in image space
        const exportWidth = rect.width / exportScale;
        const exportHeight = rect.height / exportScale;

        const canvas = document.createElement("canvas");
        canvas.width = exportWidth * QUALITY;
        canvas.height = exportHeight * QUALITY;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
            throw new Error("Canvas context unavailable");
        }

        // High-res render
        ctx.scale(QUALITY, QUALITY);

        // White background
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, exportWidth, exportHeight);

        // Match CSS: transform-origin center; translate → scale → rotate on the <img>.
        // Pinch zoom is already in exportWidth/exportHeight via exportScale (baseScale * scale);
        // do not ctx.scale(scale) or zoom is applied twice.
        // Canvas applies transforms right-to-left on geometry: T_center * R * T_pan * v  ≡  R * (v + pan) from center.
        ctx.translate(exportWidth / 2, exportHeight / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.translate(position.x / baseScale, position.y / baseScale);

        ctx.drawImage(
            img,
            -img.naturalWidth / 2,
            -img.naturalHeight / 2
        );

        const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, "image/jpeg", 0.95)
        );

        if (!blob) {
            throw new Error("Invalid captured blob");
        }

        return blob;
    };



    const handleNext = async () => {

        if (!selectedTemplate) {
            //setError('No design selected')
            notify('error', 'No design selected')
            return
        }

        if (selectedStyle == "Pro" && !hasPackUnlocks) {
            notify('error', 'Unlock Pro templates in the store.')
            return
        }

        if (selectedStyle == "Designer" && !isSupporter) {
            notify('error', 'Unlock Designer templates in the store.')
            return
        }

        // console.log("Saved position:", savedPosition);
        // console.log("Saved scale:", savedScale);
        // console.log("Saved rotation:", savedRotation);

        // console.log("Current position:", position);
        // console.log("Current scale:", scale);
        // console.log("Current rotation:", rotation);

        if (savedPosition != null && savedScale != null && savedRotation != null) {
            const EPSILON = 0.0001; // acceptable difference

            const samePosition =
                Math.abs(position.x - savedPosition.x) < EPSILON &&
                Math.abs(position.y - savedPosition.y) < EPSILON;

            const sameScale = Math.abs(scale - savedScale) < EPSILON;
            const sameRotation = Math.abs(rotation - savedRotation) < EPSILON;

            console.log(
                `Same position: ${samePosition}, Same scale: ${sameScale}, Same rotation: ${sameRotation}`
            );

            if (samePosition && sameScale && sameRotation) {
                console.log("Transforms unchanged, skipping upload.");
                // You can still navigate to the next page
                setLoading(true);
                router.push('/generate/identify')
                return;
            }
        }


        try {
            const capturedBlob = await captureUserImage(
                containerRefForImage,
                baseImgRef,
                position,
                scale,
                rotation
            )

            setLoading(true)

            await uploadCapturedImage(capturedBlob)

            // persist coordinates for later use
            setSavedPosition(position);
            setSavedScale(scale);
            setSavedRotation(rotation);

            router.push('/generate/identify')
        } catch (e) {
            console.error(e)
            setLoading(false)
            setError('Failed to process image')
        }
    }


    const uploadCapturedImage = async (blob: Blob) => {
        const currentUser = auth.currentUser
        if (!currentUser) throw new Error('Not authenticated')

        const ts = Date.now()
        const path = `user_uploads/crops/${ts}_crop.jpg`

        const refFull = ref(storage, path)

        await uploadBytes(refFull, blob)

        const url = await getDownloadURL(refFull)

        setUserPosterImgDownloadUrl(url)
        sessionStorage.setItem('croppedPosterImageUrl', url)
    }


    useEffect(() => {
        if (!filteredTemplates.length) return;
        setSelectedTemplate(filteredTemplates[index]);
    }, [index, filteredTemplates, setSelectedTemplate]);

    useEffect(() => {
        if (selectedTemplate?.alignSelect === true && selectedTemplate.alignDefault) {
            setAlignChosen(selectedTemplate.alignDefault);
        } else {
            setAlignChosen(null);
        }
    }, [selectedTemplate?.id, selectedTemplate?.alignSelect, selectedTemplate?.alignDefault, setAlignChosen]);


    const handleBack = () => {
        setHexValue('');
        setAccentHexValue('');
        setAlignChosen(null);
        setCarDetails({ make: '', model: '', year: '' })
        setSavedPosition(null);
        setSavedRotation(null);
        setSavedScale(null);

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
            console.log(data);
            setLoading(false)
        }
        fetchTemplates()

        setIndex(templateIndex)
    }, [])

    // Fetch favorites when user is loaded
    useEffect(() => {
        if (!user) return

        const userRef = doc(db, 'users', user.uid)

        const unsubscribe = onSnapshot(userRef, (snap) => {
            if (!snap.exists()) return

            const data = snap.data()

            setCredits(data.credits ?? 0)
            setFavoriteTemplates(data.settings?.favouriteTemplates ?? [])
            setInstagramHandle(data.instagramHandle ?? '')

            const hasPackUnlocks =
                typeof data.hasPackUnlocks === 'boolean'
                    ? data.hasPackUnlocks
                    : false

            const supporter =
                data.supporter && typeof data.supporter === 'object'
                    ? {
                        isActive: Boolean(data.supporter.isActive),
                        expiresAt: data.supporter.expiresAt ?? null,
                    }
                    : {
                        isActive: false,
                        expiresAt: null,
                    }


            const hasUnlocks = Boolean(hasPackUnlocks)

            let isSupporter = false;
            if (supporter?.isActive && supporter.expiresAt) {
                let expiresAt: Date;

                // Type narrowing
                const expires = supporter.expiresAt as { seconds: number } | Date;

                if ('seconds' in expires) {
                    // Firestore Timestamp
                    expiresAt = new Date(expires.seconds * 1000);
                } else {
                    // Already a Date
                    expiresAt = expires as Date;
                }

                isSupporter = expiresAt > new Date();
            }

            console.log("hasPackUnlocks:", hasUnlocks);
            console.log("supporter:", isSupporter);

            setHasPackUnlocks(hasUnlocks)
            setIsSupporter(isSupporter)

            if (!data.settings?.hideMagazinePopup) {
                setTimeout(() => {
                    // window.scrollTo({
                    //     top: document.documentElement.scrollHeight,
                    //     behavior: 'smooth',
                    // })
                    setShowMagazinePopup(true)
                }, 1000)
            }

            if (!data.settings?.hideBrandsPopup) {
                setShowBrandsPopup(true)
            }
        })

        return unsubscribe
    }, [user])

    // Toggle favorite
    const toggleFavorite = async (templateId: string) => {
        if (!user) return

        const userRef = doc(db, 'users', user.uid)
        const isFav = favoriteTemplates.includes(templateId)

        try {
            await updateDoc(userRef, {
                'settings.favouriteTemplates': isFav
                    ? arrayRemove(templateId)
                    : arrayUnion(templateId),
            })
        } catch (err) {
            console.error('Failed to update favorite:', err)
        }
    }



    // IMAGEURL Stuff
    const [fullUrl, setFullUrl] = useState<string | null>(null)
    const [retry, setRetry] = useState(0)

    useEffect(() => {
        if (userImgDownloadUrl) {
            setFullUrl(userImgDownloadUrl)
            return
        }

        const stored = sessionStorage.getItem('fullUrl')
        if (stored) setFullUrl(stored)
    }, [userImgDownloadUrl])


    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
        >
            {loading ? (
                <LoadingPage text="Loading..." />
            ) : error ? (
                <ErrorPage text={error} />
            ) : (
                <section id="select template" className="p-4 sm:p-6 md:p-8 mx-auto w-full max-w-3xl">

                    <div className="flex flex-col z-40 items-center mb-6 relative p-[4px] bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl">
                        <div className="flex flex-col items-center bg-white rounded-xl px-6 py-6 w-full">
                            <h1 className={`text-3xl sm:text-4xl md:text-5xl text-blue-400 text-center mb-2 ${archivoBlack.className}`}>
                                Choose A Design
                            </h1>
                            <p className="text-sm sm:text-base md:text-lg text-gray-500 text-center mb-2">
                                **Placeholder text only**
                            </p>
                            <p className="text-sm sm:text-base md:text-lg text-gray-700 text-center">
                                <b>Tap your image to toggle edit mode</b> to reposition & rotate your image.
                            </p>
                        </div>
                    </div>

                    {/* Template Preview */}
                    <div
                        className="relative flex flex-col items-center w-full max-w-xl mx-auto mb-6"
                    >

                        {/* Floating heart animation */}
                        <AnimatePresence>
                            {showHeart && (
                                <motion.div
                                    key="heart"
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1.5, opacity: 1 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="absolute z-50 text-red-500 text-3xl select-none pointer-events-none left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                                >
                                    ❤️
                                </motion.div>
                            )}
                        </AnimatePresence>


                        <div
                            ref={containerRefForImage}
                            className={`relative z-40 w-full max-w-xs mx-auto rounded-sm overflow-hidden aspect-[5/7] 
    ${editMode ? 'outline-2 outline-black outline-dotted transition-all duration-700' : 'transition-all duration-700'}`}
                            {...bind()}

                        >
                            {selectedStyle == "Pro" && !hasPackUnlocks && (
                                <div className="absolute top-5 right-5 flex flex-col items-center z-41">
                                    <img
                                        className="w-9 h-9"
                                        src="/svg/padlock_blue.svg"
                                        alt="Locked"
                                    />
                                    <p className="text-xs mt-1 text-blue-400">Locked</p>
                                </div>
                            )}
                            {selectedStyle == "Designer" && !isSupporter && (
                                <div className="absolute top-5 right-5 flex flex-col items-center z-41">
                                    <img
                                        className="w-9 h-9"
                                        src="/svg/padlock_blue.svg"
                                        alt="Locked"
                                    />
                                    <p className="text-xs mt-1 text-blue-400">Locked</p>
                                </div>
                            )}

                            {/* Base image (gesture owner) */}
                            <img
                                ref={baseImgRef}
                                src={`${fullUrl}#${retry}`}
                                crossOrigin="anonymous"

                                alt="Base"
                                className="absolute inset-0 w-full h-full object-contain touch-none"
                                onError={() => {
                                    setTimeout(() => setRetry((r) => r + 1), 1500)
                                }}
                                style={{
                                    transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
                                }}
                            />

                            {/* Template overlay image (visual only) */}
                            {currentTemplate?.previewImageUrl && (
                                <AnimatePresence initial={false} custom={direction}>
                                    <motion.div
                                        key={currentTemplate.id}
                                        className="absolute inset-0 w-full h-full pointer-events-none"  // ← add this
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
                                        onAnimationComplete={() => setIsAnimating(false)}
                                    >
                                        <motion.img
                                            src={currentTemplate.previewImageUrl}
                                            alt={currentTemplate.name}
                                            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                                            animate={{ opacity: isReversed ? 0 : (editMode ? 0.35 : 1) }}
                                            transition={{ duration: 0.4 }}
                                        />
                                        {currentTemplate.previewImageReverseUrl && (
                                            <motion.img
                                                src={currentTemplate.previewImageReverseUrl}
                                                alt={currentTemplate.name}
                                                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                                                animate={{ opacity: isReversed ? (editMode ? 0.35 : 1) : 0 }}
                                                transition={{ duration: 0.4 }}
                                            />
                                        )}
                                    </motion.div>
                                </AnimatePresence>
                            )}

                            {/* Colorable overlay */}
                            {previewHexUrl && hexValue !== "" && (
                                <motion.canvas
                                    ref={overlayCanvasRef}
                                    className="absolute inset-0 w-full h-full pointer-events-none z-20"
                                    style={{ transform: 'translateX(-0.5px)' }}
                                    animate={{ opacity: editMode ? 0.35 : 1 }}
                                    transition={{ duration: 0.2 }}
                                />
                            )}

                            {previewHexAccentUrl && accentHexValue !== "" && (
                                <motion.canvas
                                    ref={accentOverlayCanvasRef}
                                    className="absolute inset-0 w-full h-full pointer-events-none z-30"
                                    style={{ transform: 'translateX(-0.5px)' }}
                                    animate={{ opacity: editMode ? 0.35 : 1 }}
                                    transition={{ duration: 0.2 }}
                                />
                            )}

                        </div>



                        {/* Colour picker popup */}
                        <div className="flex justify-center relative" ref={containerRef}>

                            {/* Backdrop */}
                            <div
                                className={`
      fixed inset-x-0 bottom-0 top-[0px] bg-white/60 backdrop-blur-xs z-30
      transition-opacity duration-300
      ${colorOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
    `}
                                onClick={(e) => { e.stopPropagation(); setColorOpen(false); }}
                            />

                            {/* Panel */}
                            <div
                                className={`
      absolute left-1/2 -top-20 -translate-x-1/2 z-50 mt-25
      w-[90vw] max-w-[320px] sm:mx-4 md:mx-0
      bg-black/70 rounded-2xl
      transition-all duration-300 ease-out
      ${colorOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}
    `}
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Slider thumb styles */}
                                <style>{`
      .cp-slider {
        -webkit-appearance: none;
        appearance: none;
        outline: none;
        border-radius: 9999px;
      }
      .cp-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #ffffff;
        border: 2px solid rgba(0, 0, 0, 0.2);
        box-shadow: 0 1px 5px rgba(0, 0, 0, 0.55);
        cursor: pointer;
        transition: transform 0.1s ease;
      }
      .cp-slider::-webkit-slider-thumb:active {
        transform: scale(1.25);
      }
      .cp-slider::-moz-range-thumb {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #ffffff;
        border: 2px solid rgba(0, 0, 0, 0.2);
        box-shadow: 0 1px 5px rgba(0, 0, 0, 0.55);
        cursor: pointer;
      }
    `}</style>

                                <div className="flex flex-col gap-4 p-4">

                                    {/* ── Colour ── */}
                                    <div className="flex flex-col gap-1.5">
                                        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 select-none">
                                            Colour
                                        </span>
                                        <input
                                            type="range"
                                            min={0}
                                            max={360}
                                            value={pickerHue}
                                            onChange={(e) => {
                                                const hue = Number(e.target.value);
                                                setPickerHue(hue);
                                                applyPickerColor(hue, pickerLightness);
                                            }}
                                            className="cp-slider w-full h-3 cursor-pointer"
                                            style={{
                                                background: `linear-gradient(to right,
              white         0%,
              hsl(0,100%,50%)   8%,
              hsl(30,100%,50%)  16%,
              hsl(60,100%,50%)  25%,
              hsl(90,100%,50%)  33%,
              hsl(120,100%,50%) 41%,
              hsl(150,100%,50%) 50%,
              hsl(180,100%,50%) 58%,
              hsl(210,100%,50%) 66%,
              hsl(240,100%,50%) 75%,
              hsl(270,100%,50%) 83%,
              hsl(300,100%,50%) 91%,
              hsl(330,100%,50%) 96%,
              hsl(360,100%,50%) 100%)`,
                                            }}
                                        />
                                    </div>

                                    {/* ── Brightness ── */}
                                    <div className="flex flex-col gap-1.5">
                                        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 select-none">
                                            Brightness
                                        </span>
                                        <input
                                            type="range"
                                            min={0}
                                            max={100}
                                            value={pickerLightness}
                                            onChange={(e) => {
                                                const lightness = Number(e.target.value);
                                                setPickerLightness(lightness);
                                                applyPickerColor(pickerHue, lightness);
                                            }}
                                            className="cp-slider w-full h-3 cursor-pointer"
                                            style={{
                                                background: `linear-gradient(to right,
              #000 0%,
              ${pickerHue === 0
                                                        ? "hsl(0,0%,50%)"
                                                        : `hsl(${pickerHue},100%,50%)`
                                                    } 50%,
              #fff 100%)`,
                                            }}
                                        />
                                    </div>

                                    {/* ── Preview ── */}
                                    <div className="flex items-center gap-3 pt-2 border-t border-white/10">
                                        <div
                                            className="w-6 h-6 rounded-full ring-1 ring-white/20 flex-shrink-0 shadow-inner"
                                            style={{
                                                background: `hsl(${pickerHue}, ${pickerHue === 0 ? 0 : 100}%, ${pickerLightness}%)`,
                                            }}
                                        />
                                        <span className="text-[11px] font-mono tracking-wider text-gray-300">
                                            {hslToHex(pickerHue, pickerHue === 0 ? 0 : 100, pickerLightness).toUpperCase()}
                                        </span>
                                    </div>

                                </div>
                            </div>

                        </div>



                        {/* Template Controls */}
                        <div className="mt-6 mx-auto max-w-md">

                            {/* Unified Control Card */}
                            <div
                                className={`rounded-2xl overflow-hidden shadow-lg border border-white/10 
        bg-gradient-to-br from-black/80 to-black/60 backdrop-blur-sm
        transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
        ${showAdvanced ? 'max-w-md' : 'max-w-[340px]'}`}
                            >

                                {/* Header */}
                                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">

                                    {/* Primary colour */}
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div
                                            className={`h-9 w-9 rounded-lg border transition-all shadow-inner shrink-0
                    ${selectedTemplate?.hexElements ? 'cursor-pointer' : 'opacity-30 pointer-events-none'}`}
                                            style={{
                                                background: hexValue
                                                    ? hexValue
                                                    : "linear-gradient(45deg, #ff6b6b, #f59e0b, #10b981, #3b82f6, #8b5cf6)"
                                            }}
                                            onClick={() => {
                                                if (!editMode && selectedTemplate?.hexElements) {
                                                    setColorPickerMode('primary');
                                                    setColorOpen(true);
                                                }
                                            }}
                                        />

                                        {/* Animated "Primary" label */}
                                        <span
                                            className={`text-xs uppercase tracking-wider text-white/60 whitespace-nowrap
                    transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
                    ${showAdvanced ? 'opacity-100 translate-x-0 ml-1' : 'opacity-0 -translate-x-2 ml-0 w-0 overflow-hidden'}`}
                                        >
                                            Primary
                                        </span>
                                    </div>

                                    {/* Template name */}
                                    <div className="text-center flex-1 mx-3 text-sm font-semibold tracking-wide text-white truncate">
                                        {currentTemplate?.name}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 shrink-0">

                                        <button
                                            onClick={() => setHexValue("")}
                                            disabled={!hexValue || !selectedTemplate?.hexElements}
                                            className="w-8 h-8 flex items-center justify-center rounded-md border border-white/10 
                    hover:bg-white/10 transition disabled:opacity-20 disabled:pointer-events-none"
                                        >
                                            <img src="/svg/xmark_gray.svg" className="w-4 h-4" />
                                        </button>

                                        <button
                                            onClick={() => setShowAdvanced(v => !v)}
                                            className="w-8 h-8 flex items-center justify-center rounded-md 
                    bg-gradient-to-r from-cyan-600 to-blue-700 text-white text-sm font-bold shadow-md
                    transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
                                        >
                                            {showAdvanced ? '−' : '+'}
                                        </button>
                                    </div>
                                </div>

                                {/* Expandable Section */}
                                <div
                                    className={`overflow-hidden
            transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
            ${showAdvanced ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}
                                >
                                    <div className="divide-y divide-white/10">

                                        {/* Accent */}
                                        <div className="flex items-center justify-between px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`h-8 w-8 rounded-md border
                            ${selectedTemplate?.accentColourSelect ? 'cursor-pointer' : 'opacity-30 pointer-events-none'}`}
                                                    style={{
                                                        background: accentHexValue
                                                            ? accentHexValue
                                                            : "linear-gradient(45deg, #ff6b6b, #f59e0b, #10b981, #3b82f6, #8b5cf6)"
                                                    }}
                                                    onClick={() => {
                                                        if (!editMode && selectedTemplate?.accentColourSelect) {
                                                            setColorPickerMode('accent');
                                                            setColorOpen(true);
                                                        }
                                                    }}
                                                />
                                                <span className="text-xs uppercase tracking-wider text-white/60">
                                                    Accent
                                                </span>
                                            </div>

                                            <button
                                                onClick={() => setAccentHexValue('')}
                                                disabled={!accentHexValue || !selectedTemplate?.accentColourSelect}
                                                className="w-8 h-8 flex items-center justify-center rounded-md border border-white/10 
                        hover:bg-white/10 transition disabled:opacity-20 disabled:pointer-events-none"
                                            >
                                                <img src="/svg/xmark_gray.svg" className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* Alignment */}
                                        <div className="flex items-center justify-between px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`inline-flex rounded-lg overflow-hidden border border-white/20 bg-white/[0.05] p-[2px]
                            ${(!selectedTemplate?.alignSelect || !selectedTemplate?.alignDefault) ? 'opacity-30 pointer-events-none' : ''}`}
                                                >
                                                    <button
                                                        type="button"
                                                        disabled={editMode}
                                                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all
                                ${(alignChosen ?? selectedTemplate?.alignDefault) === 'left'
                                                                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow'
                                                                : 'text-white/70 hover:bg-white/10'}
                                disabled:opacity-50`}
                                                        onClick={() => setAlignChosen('left')}
                                                    >
                                                        Left
                                                    </button>

                                                    <button
                                                        type="button"
                                                        disabled={editMode}
                                                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all
                                ${(alignChosen ?? selectedTemplate?.alignDefault) === 'right'
                                                                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow'
                                                                : 'text-white/70 hover:bg-white/10'}
                                disabled:opacity-50`}
                                                        onClick={() => setAlignChosen('right')}
                                                    >
                                                        Right
                                                    </button>
                                                </div>

                                                <span className="text-xs uppercase tracking-wider text-white/60">
                                                    Align
                                                </span>
                                            </div>
                                        </div>

                                    </div>
                                </div>

                            </div>
                        </div>




                    </div>





                    {/* Template Styles Slider */}
                    {filteredTemplates.length > 0 ? (
                        <TemplateSlider
                            length={filteredTemplates.length}
                            index={index}
                        />
                    ) : (
                        <div className="text-sm text-gray-400 text-center mt-2 mb-5">
                            {selectedStyle === "Favourites" ? "No favourites. Double tap a design to favourite!" : "No designs here."}
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
                                        setAccentHexValue('');
                                        setAlignChosen(null);
                                        setSelectedStyle(style);
                                        setSelectedTemplate(null);
                                        setShowAdvanced(false);
                                        if (style === "Brands") {
                                            if (showBrandsPopup) {
                                                window.scrollTo({
                                                    top: document.documentElement.scrollHeight,
                                                    behavior: "smooth",
                                                });
                                            }

                                        }
                                    }}
                                    className={className}
                                >
                                    {style}
                                </button>
                            );
                        })}
                    </div>


                    {/* Navigation Buttons */}
                    <div className="flex justify-center gap-4 mt-8 mb-5">
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


                    {showMagazinePopup && selectedStyle === "Basic" && (
                        <div
                            className="fixed inset-0 z-50"
                            onClick={handleCloseMagazinePopup}
                        >
                            {/* Dark overlay */}
                            <div className="absolute inset-0 bg-black/70" />

                            {/* Text */}
                            <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
                                <div
                                    className="bg-gray-700/50 backdrop-blur-sm border border-white rounded-xl px-6 py-4 max-w-sm text-white text-sm whitespace-pre-line mt-[-170px]"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="text-base font-semibold mb-4">
                                        <p>Here&apos;s where things get cool!</p>
                                    </div>

                                    <div className="mb-6">
                                        <p className=''>There are 4 groups of designs that you can explore below.<br></br><br></br></p>
                                        <p className='text-gray-300'>Each template is designed to be very versatile!<br></br><br></br></p>

                                        <p>Automatically includes:</p>
                                        <p className='text-xs'>
                                            • Car Make<br></br>
                                            • Car Model<br></br>
                                            • Car Year<br></br>
                                            • Car Description<br></br>
                                            • Current Date<br></br>
                                            • Your Instagram Handle<br></br>
                                        </p>

                                        <p className='mt-4'>Want to change colour? Just tap the colourful square!</p>

                                    </div>

                                    <label className="flex items-center gap-2 text-xs opacity-90 cursor-pointer text-gray-400">
                                        <input
                                            type="checkbox"
                                            checked={dontShowAgainMagazine}
                                            onChange={(e) => setDontShowAgainMagazine(e.target.checked)}
                                            className="accent-cyan-400"
                                        />
                                        <span>Don&apos;t show this again</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}
                    {showBrandsPopup && selectedStyle === "Brands" && (
                        <div
                            className="fixed inset-0 z-50"
                            onClick={handleCloseBrandsPopup}
                        >
                            {/* Dark overlay */}
                            <div className="absolute inset-0 bg-black/70" />

                            {/* Text */}
                            <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
                                <div
                                    className="bg-gray-700/50 backdrop-blur-sm border border-white rounded-xl px-6 py-4 max-w-sm text-white text-sm whitespace-pre-line mt-[-170px]"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="text-base font-semibold mb-4">
                                        <p>What are &quot;Brands&quot; templates?</p>
                                    </div>

                                    <div className="mb-6">
                                        <p className='text-gray-300'>These templates are designed for specific car brands only.<br /><br /></p>

                                        <p><strong>Important:</strong> The car <em>make</em> will <u>not</u> update automatically. It is fixed in the template.</p><br />
                                        <p className="text-xs">
                                            • Car Make: static<br />
                                            • Car Model: dynamic<br />
                                            • Car Year: dynamic<br />
                                            • Car Description: dynamic<br />
                                            • Current Date: dynamic<br />
                                            • Your Instagram Handle: dynamic
                                        </p>
                                    </div>


                                    <label className="flex items-center gap-2 text-xs opacity-90 cursor-pointer text-gray-400">
                                        <input
                                            type="checkbox"
                                            checked={dontShowAgainBrands}
                                            onChange={(e) => setDontShowAgainBrands(e.target.checked)}
                                            className="accent-cyan-400"
                                        />
                                        <span>Don&apos;t show this again</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                </section>)}

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
