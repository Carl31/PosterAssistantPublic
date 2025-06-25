/* eslint-disable @next/next/no-img-element */
 


// Page is for uploading user image

'use client'

import { motion } from 'framer-motion'
import { usePosterWizard, isStepAccessible } from '@/context/PosterWizardContext'
import { useState, useEffect } from 'react'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { auth } from '@/firebase/client'
import { useRouter } from 'next/navigation';
import imageCompression from 'browser-image-compression';
import Spinner from '@/components/Spinner';


export default function UploadImageStep() {
    const {
        setImage,
        previewUrl, setPreviewUrl
    } = usePosterWizard()
    const { state } = usePosterWizard();

    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleNext = () => {
        router.push('/generate/identify')
    }

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
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        setLoading(true)
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

        setLoading(false)

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

                    <input
                        id="imageInput"
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="mb-4"
                    />

                    {loading ? <Spinner /> : (
                        (previewUrl != null) && (
                            <div className="w-full aspect-[3/4] relative rounded-xl shadow-lg overflow-hidden">
                                <img
                                    src={previewUrl!}
                                    alt="Preview"
                                    className="absolute inset-0 w-full h-full object-cover"
                                />
                            </div>
                        )
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
}
