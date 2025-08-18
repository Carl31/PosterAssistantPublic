/* eslint-disable @typescript-eslint/no-explicit-any */

// Page is for uploading user image

'use client'

import { motion } from 'framer-motion'
import { usePosterWizard } from '@/context/PosterWizardContext'
import { useState, useCallback, useEffect } from 'react'
import { getStorage, ref, uploadBytes, getDownloadURL, listAll } from 'firebase/storage'
import { auth } from '@/firebase/client'
import { useRouter } from 'next/navigation'
import Cropper from 'react-easy-crop'
import { Area } from 'react-easy-crop'
import { getCroppedImg } from '@/utils/cropImage'
import LoadingPage from '@/components/LoadingPage'
import { onAuthStateChanged, User } from 'firebase/auth'
import { getAuth } from 'firebase/auth'
import { useSearchParams } from 'next/navigation';
import { Archivo_Black } from "next/font/google";
import Spinner from '@/components/Spinner';

const archivoBlack = Archivo_Black({
  weight: "400", // Archivo Black only has 400
  subsets: ["latin"],
});

export default function UploadImageStep() {
  const { setuserImgDownloadUrl, setuserImgThumbDownloadUrl } = usePosterWizard()
  const [image, setImage] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const storage = getStorage()

  // Cropper states
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

  // Auth + user images
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [userImages, setUserImages] = useState<{ thumbUrl: string; originalUrl: string; }[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const searchParams = useSearchParams();
  const cameFromSelectPage = searchParams!.get('imageUploaded') === 'true';

  // --- Auth ---
  useEffect(() => {
    const auth = getAuth()
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setAuthLoading(false)
    })
    return () => unsubscribe()
  }, [])

  // --- Fetch images when logged in ---
  useEffect(() => {
    const fetchImages = async () => {
      if (authLoading || !user) {
        setUserImages([])
        return
      }

      setImagesLoading(true)
      setError(null)

      try {
        const imagesRef = ref(storage, `user_uploads/${user.uid}/`)
        const res = await listAll(imagesRef)
        // const urls = await Promise.all(res.items.map((imageRef) => getDownloadURL(imageRef)))
        // setUserImages(urls)

        const urls = await Promise.all(
          res.items
            .filter((item) => item.name.includes('_thumb'))
            .map(async (thumbRef) => {
              const thumbUrl = await getDownloadURL(thumbRef);
              const originalName = thumbRef.name.replace('_thumb', '');
              const originalRef = ref(storage, `user_uploads/${user.uid}/${originalName}`);
              const originalUrl = await getDownloadURL(originalRef);

              return { thumbUrl, originalUrl };
            })
        );
        setUserImages(urls); // [{ thumbUrl, originalUrl }, ...]
      } catch (err: any) {
        setError(`Failed to load images: ${err.message}`)
        setUserImages([])
      } finally {
        setImagesLoading(false)
      }
    }

    fetchImages()

    // Re-fetch images again after 3s delay - to catch the most recently uploaded image if it was uploaded just now
    if (cameFromSelectPage) {
      const timer = setTimeout(fetchImages, 3000); // double-check after 3s
      return () => clearTimeout(timer);
    }
  }, [authLoading, user])

  // --- Handlers ---
  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.')
      const imageInput = document.getElementById('imageInput') as HTMLInputElement
      imageInput.value = ''
      return
    }
    setImage(file)
  }

  const handleSelectExisting = (thumbUrl: string, imageUrl: string) => {
    setuserImgDownloadUrl(imageUrl)
    setuserImgThumbDownloadUrl(thumbUrl)
    router.push('/generate/select')
  }

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleBack = () => {
    setImage(null)
    setuserImgDownloadUrl(null)
    router.push('/account/dashboard')
  }

  const compressImageInWorker = (file: Blob, options: any) => {
    return new Promise<Blob>((resolve, reject) => {
      const worker = new Worker(new URL('../../../../public/workers/imageCompressor.js', import.meta.url), {
        type: 'module',
      })

      worker.onmessage = (e) => {
        if (e.data.error) reject(new Error(e.data.error))
        else resolve(new Blob([e.data], { type: 'image/jpeg' }))
      }
      worker.onerror = reject
      worker.postMessage({ file, options })
    })
  }

  const handleImageUpload = async () => {
    if (!image || !auth.currentUser || !croppedAreaPixels) return
    setLoading(true)
    const user = auth.currentUser

    try {
      const croppedBlob = await getCroppedImg(URL.createObjectURL(image), croppedAreaPixels)

      let finalBlob: Blob = croppedBlob
      if (croppedBlob.size / (1024 * 1024) > 4) {
        finalBlob = await compressImageInWorker(croppedBlob, {
          maxSizeMB: 4,
          maxWidthOrHeight: 5000,
          fileType: 'image/jpeg',
          initialQuality: 0.9,
        })
      }

      const storageRef = ref(storage, `user_uploads/${user.uid}/${image.name}`)
      const snapshot = await uploadBytes(storageRef, finalBlob)
      const downloadURL = await getDownloadURL(snapshot.ref)

      setuserImgDownloadUrl(downloadURL)

      let retryCount = 0;
      const maxRetries = 3;
      const delay = 2000; // 2 seconds

      while (retryCount <= maxRetries) {
        try {
          const storageThumbRef = ref(storage, `user_uploads/${user.uid}/${image.name.replace(/\.(?=[^.]+$)/, '_thumb.')}`)
          await new Promise(resolve => setTimeout(resolve, delay))
          const downloadThumbURL = await getDownloadURL(storageThumbRef)
          setuserImgThumbDownloadUrl(downloadThumbURL)
          console.log("Thumb url", downloadThumbURL);
          break; // success, exit the loop
        } catch (error: any) {
          retryCount++;
          console.log(`Attempt ${retryCount} failed: ${error.message}`);
          if (retryCount > maxRetries) {
            throw error; // rethrow the error if all retries fail
          }
        }
      }

      router.push('/generate/select?upload=true')
    } catch (err) {
      console.error('Upload failed:', err)
      alert('Image processing failed.')
    } finally {
      // setLoading(false)
    }
  }

  // --- Render ---
  if (authLoading) return <p>Authenticating...</p>
  if (!user) return <p>Please log in to see and upload images.</p>

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
      <div className="p-2 max-w-xl mx-auto">
        {loading ? (
          <LoadingPage text="Uploading image..." />
        ) : (
          <>
            {/* Upload & Crop Section */}
            <section id="upload image" className="mb-8 mt-5">
              <div className="border-4 border-blue-700 max-w-md mx-auto p-4 px-4 py-2 mb-12 flex flex-col items-center shadow-[0_0_14px_rgba(59,130,246,0.7)]">
                <h1 className={`text-2xl text-gray-200 ${archivoBlack.className}`}>
                  Choose an image
                </h1>
              </div>

              <h1 className="text-xl font-bold mb-4 ">Upload Your Image</h1>
              {!image ? (
                <label
                  htmlFor="imageInput"
                  className="cursor-pointer text-black"
                >
                  <div className="bg-blue-300 text-black px-4 py-4 rounded-xl flex flex-col items-center">
                    <img
                      className="w-9 h-9 mt-2 mb-2"
                      src="/svg/upload.svg"
                      alt="uploadSVG"
                    />


                    Upload Image


                    <input
                      id="imageInput"
                      type="file"
                      accept="image/*"
                      onChange={onSelectFile}
                      className="hidden"
                    />
                  </div>
                </label>

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
                  <button onClick={handleImageUpload} disabled={!image} className="mt-4 text-white bg-gradient-to-br from-purple-600 to-blue-500 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2">
                    Confirm and Upload
                  </button>
                </>
              )}
            </section>

            {/* Gallery Section */}
            <section id="user images">
              <h1 className="text-xl font-bold mb-4">Your Uploaded Images</h1>
              {imagesLoading ? (
                <span>
                  <Spinner />
                </span>

              ) : error ? (
                <p style={{ color: 'red' }}>{error}</p>
              ) : userImages.length === 0 ? (
                <p>No images found for your account. Time to upload some!</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {userImages.length > 0 && userImages.map(({ thumbUrl, originalUrl }) => (
                    <img
                      key={thumbUrl}
                      src={thumbUrl}
                      alt="User Upload"
                      onClick={() => handleSelectExisting(thumbUrl, originalUrl)}
                      className="rounded-md object-cover w-full h-60 cursor-pointer  transform transition active:scale-95 
             hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  ))}
                </div>
              )}
            </section>

            <button onClick={handleBack} className="mt-8 relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-pink-500 to-orange-400 group-hover:from-pink-500 group-hover:to-orange-400 hover:text-white dark:text-white focus:ring-4 focus:outline-none focus:ring-pink-200 dark:focus:ring-pink-800">
              <span className="relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-transparent group-hover:dark:bg-transparent">
                Back
              </span>
            </button>
          </>
        )}
      </div>
    </motion.div>
  )
}

