



// Page is for uploading user image

'use client'

import { motion } from 'framer-motion'
import { usePosterWizard, isStepAccessible } from '@/context/PosterWizardContext'
import { useState, useEffect, useCallback } from 'react'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { auth } from '@/firebase/client'
import { useRouter } from 'next/navigation';
import imageCompression from 'browser-image-compression';
import Spinner from '@/components/Spinner';
import Cropper from 'react-easy-crop'
import { Area } from 'react-easy-crop';
import { getCroppedImg } from '@/utils/cropImage'


export default function UploadImageStep() {
    const {
        setPreviewUrl
    } = usePosterWizard()
    const { state } = usePosterWizard();
    const [image, setImage] = useState<File | null>(null);

    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const [crop, setCrop] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]

        if (!file) return

        if (!file.type.startsWith('image/')) {
            alert('Please select an image file.')
            const imageInput = document.getElementById("imageInput") as HTMLInputElement;
            imageInput.value = "";
            return
        }
        if (file) setImage(file)
    }

   const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleBack = () => {
        setImage(null)
        setPreviewUrl(null)
        router.push('/generate/select')
    }

    useEffect(() => {
        if (!isStepAccessible("upload", state)) {
            console.log("No template selected. Redirecting.");
            router.push("/generate/select");
        }
    }, [state, router]);

    // For uploading user image to Firestore (for Photopea to access later) and setting it in the UI
    const handleImageUpload = async () => {
        setLoading(true)
        const user = auth.currentUser
        let valid = true;
        let compressedFile = null;

        if (!image || !user || !croppedAreaPixels) return

        // validates file
        if (image) {

            // Check file type is an image
            if (!image.type.startsWith('image/')) {
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
            const fileSizeInMB = image.size / (1024 * 1024); // Convert bytes to MB
            if (fileSizeInMB > 5 && fileSizeInMB <= 25) { // Compresses file

                // Compress image
                const options = {
                    maxSizeMB: 4, // Try to get it well under 5MB
                    maxWidthOrHeight: 7000, // Prevent huge resolutions
                    useWebWorker: true,
                    fileType: 'image/jpeg',
                    initialQuality: 0.9,
                };

                try {
                    compressedFile = await imageCompression(image, options);
                    console.log('Size of original file:', image.size / (1024 * 1024), 'MB');
                    // print size of compressed file
                    console.log('Size of compressed file:', compressedFile.size / (1024 * 1024), 'MB');
                } catch (error) {
                    console.error('Image compression failed:', error);
                    const imageInput = document.getElementById("imageInput") as HTMLInputElement;
                    imageInput.value = "";
                    valid = false;
                    return;
                }
            } else if (fileSizeInMB <= 5) { // uploads file.
                // File is within the size limit, proceed with upload or other actions
                console.log('File size is acceptable.');
                compressedFile = image;

            } else { // File is too large
                alert('File size exceeds 25MB. Please select a smaller file.');
                const imageInput = document.getElementById("imageInput") as HTMLInputElement;
                imageInput.value = "";
                valid = false;
                return;
            }

        }



        if (valid) {
            if (compressedFile) {

                try {
                    console.log("croppedAreaPixels", croppedAreaPixels)


                    // ✅ 1. Crop the image BEFORE uploading
                    const croppedFile = await getCroppedImg(
                        URL.createObjectURL(image),
                        croppedAreaPixels
                    )

                    // ✅ 2. Upload the cropped image
                    const storage = getStorage()
                    const storageRef = ref(storage, `user_uploads/${user.uid}/${image.name}`)
                    const snapshot = await uploadBytes(storageRef, croppedFile)
                    const downloadURL = await getDownloadURL(snapshot.ref)

                    // ✅ 3. Save preview and clear loading
                    setPreviewUrl(downloadURL)
                    router.push('/generate/identify')
                } catch (err) {
                    setLoading(false)
                    console.error('Image crop/upload failed:', err)
                    alert('Image processing failed.')
                }

            }

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
                <section id='upload image'>
                    <h1 className="text-2xl font-bold mb-4">Upload Your Image</h1>

                    {!image ? (
                        <input
                            id="imageInput"
                            type="file"
                            accept="image/*"
                            onChange={onSelectFile}
                            className="mb-4"
                        />
                    ) : (
                        <>
                            <div className="relative w-full h-140 bg-gray-100">
                                <Cropper
                                    image={URL.createObjectURL(image)}
                                    crop={crop}
                                    zoom={zoom}
                                    aspect={5 / 7}
                                    onCropChange={setCrop}
                                    onZoomChange={setZoom}
                                    onCropComplete={onCropComplete}
                                />
                            </div>

                            {!loading && (
                                <button onClick={handleImageUpload} disabled={loading} className="mt-4 bg-purple-600 text-white px-4 py-2 rounded">
                                    Confirm and Upload
                                </button>
                            )}

                        </>
                    )}

                    {loading && <Spinner />}
                </section>

                {/* <button onClick={handleNext} className="mt-6 bg-blue-600 text-white px-4 py-2 rounded-md">
                    Next Step
                </button> */}
                <button onClick={handleBack} className="mt-6 bg-red-600 text-white px-4 py-2 rounded-md">
                    Back
                </button>
            </div>
        </motion.div>
    )
}
