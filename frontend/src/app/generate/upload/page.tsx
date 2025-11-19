/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { motion } from 'framer-motion'
import { usePosterWizard } from '@/context/PosterWizardContext'
import { useState, useCallback, useEffect } from 'react'
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  listAll,
} from 'firebase/storage'
import { auth } from '@/firebase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Cropper from 'react-easy-crop'
import { Area } from 'react-easy-crop'
import { getAuth, onAuthStateChanged, User } from 'firebase/auth'
import LoadingPage from '@/components/LoadingPage'
import Spinner from '@/components/Spinner'
import { Archivo_Black } from 'next/font/google'
import Notification from '@/components/Notification'

const archivoBlack = Archivo_Black({
  weight: '400',
  subsets: ['latin'],
})

// ------------------ Helper: resize + compress ------------------
async function resizeImage(
  file: Blob,
  maxLongSide = 2000,
  quality = 0.85
): Promise<Blob> {
  const url = URL.createObjectURL(file)
  const img = await createImage(url)
  const ratio = img.width / img.height
  let w = img.width
  let h = img.height

  if (Math.max(w, h) > maxLongSide) {
    if (w > h) {
      w = maxLongSide
      h = Math.round(maxLongSide / ratio)
    } else {
      h = maxLongSide
      w = Math.round(maxLongSide * ratio)
    }
  }

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, w, h)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
      'image/jpeg',
      quality
    )
  })
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      img.decode().then(() => resolve(img)).catch(reject)
    }
    img.onerror = (err) => reject(err)
    img.src = url
  })
}

// ------------------ Helper: crop ------------------
async function getCroppedImg(
  imageSrc: string,
  croppedAreaPixels: Area
): Promise<Blob> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas ctx failed')
  const { x, y, width, height } = croppedAreaPixels
  canvas.width = width
  canvas.height = height
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(image, x, y, width, height, 0, 0, width, height)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('crop blob fail'))),
      'image/jpeg',
      0.95
    )
  })
}

// ------------------ Component ------------------
export default function UploadImageStep() {
  const { setuserImgDownloadUrl, setuserImgThumbDownloadUrl } = usePosterWizard()
  const [image, setImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [userImages, setUserImages] = useState<
    { thumbUrl: string; originalUrl: string }[]
  >([])
  const [imagesLoading, setImagesLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const storage = getStorage()
  const searchParams = useSearchParams()
  const cameFromSelectPage = searchParams?.get('imageUploaded') === 'true'

  // ---------- Auth ----------
  useEffect(() => {
    const auth = getAuth()
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setAuthLoading(false)
    })
    return () => unsub()
  }, [])

  // ---------- Reuse preview URL ----------
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  // ---------- Fetch gallery ----------
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
        const urls = await Promise.all(
          res.items
            .filter((i) => i.name.includes('_thumb'))
            .map(async (thumbRef) => {
              const thumbUrl = await getDownloadURL(thumbRef)
              const originalName = thumbRef.name.replace('_thumb', '')
              const originalRef = ref(
                storage,
                `user_uploads/${user.uid}/${originalName}`
              )
              const originalUrl = await getDownloadURL(originalRef)
              return { thumbUrl, originalUrl, name: originalName }
            })
        )
        urls.sort((a, b) => {
          const A = parseInt(a.name.split('_')[0])
          const B = parseInt(b.name.split('_')[0])
          return B - A
        })
        setUserImages(urls)
      } catch (e: any) {
        setError(`Failed to load images: ${e.message}`)
        setUserImages([])
      } finally {
        setImagesLoading(false)
      }
    }

    fetchImages()
    if (cameFromSelectPage) {
      const t = setTimeout(fetchImages, 3000)
      return () => clearTimeout(t)
    }
  }, [authLoading, user])

  // ---------- Handlers ----------
  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.')
      return
    }
    setImage(file)
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
  }

  const handleSelectExisting = (thumbUrl: string, imageUrl: string) => {
    setuserImgDownloadUrl(imageUrl)
    setuserImgThumbDownloadUrl(thumbUrl)
    router.push('/generate/select')
  }

  const onCropComplete = useCallback(
    (_c: Area, p: Area) => setCroppedAreaPixels(p),
    []
  )

  const handleBack = () => {
    setImage(null)
    setuserImgDownloadUrl(null)
    router.push('/account/dashboard')
  }

  // ---------- Upload ----------
  const handleImageUpload = async () => {
    if (!image || !auth.currentUser || !croppedAreaPixels || !previewUrl) return
    setLoading(true)
    const user = auth.currentUser
    try {
      const cropped = await getCroppedImg(previewUrl, croppedAreaPixels)
      const [fullBlob, thumbBlob] = await Promise.all([
        resizeImage(cropped, 2000, 0.85),
        resizeImage(cropped, 800, 0.7),
      ])
      const ts = Date.now()
      const base = `${ts}_${image.name.replace(/\s+/g, '_')}`
      const fullRef = ref(storage, `user_uploads/${user.uid}/${base}`)
      const thumbRef = ref(
        storage,
        `user_uploads/${user.uid}/${base.replace(/\.(?=[^.]+$)/, '_thumb.')}`
      )

      const [fullSnap, thumbSnap] = await Promise.all([
        uploadBytes(fullRef, fullBlob),
        uploadBytes(thumbRef, thumbBlob),
      ])

      const [fullUrl, thumbUrl] = await Promise.all([
        getDownloadURL(fullSnap.ref),
        getDownloadURL(thumbSnap.ref),
      ])

      setuserImgDownloadUrl(fullUrl)
      setuserImgThumbDownloadUrl(thumbUrl)
      await new Promise(r => setTimeout(r, 0))
      router.push('/generate/select?upload=true')
    } catch (e) {
      console.error('Upload failed', e)
      alert('Image upload failed.')
    }
  }

  // ---------- Render ----------
  if (authLoading) return <p>Authenticating...</p>
  if (!user) return <p>Please log in to see and upload images.</p>

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <div className="p-2 mx-auto">
        <Notification />
        {loading ? (
          <LoadingPage text="Uploading image..." />
        ) : (
          <>
            <section id="upload image" className="mb-8 mt-5">
              <div className="border-3 border-blue-400 max-w-md mx-auto p-4 px-4 py-2 mb-12 flex flex-col items-center shadow-[0_0_14px_rgba(59,130,246,0.7)]">
                <h1 className={`text-2xl text-gray-200 ${archivoBlack.className}`}>
                  Choose an image
                </h1>
              </div>

              <h1 className="text-xl font-bold mb-4">Upload Your Image</h1>
              {!image ? (
                <label htmlFor="imageInput" className="cursor-pointer text-black">
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
                      image={previewUrl!}
                      crop={crop}
                      zoom={zoom}
                      aspect={5 / 7}
                      onCropChange={setCrop}
                      onZoomChange={setZoom}
                      onCropComplete={onCropComplete}
                    />
                  </div>
                  <button
                    onClick={handleImageUpload}
                    disabled={!image}
                    className="mt-4 text-white bg-gradient-to-br from-purple-600 to-blue-500 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2"
                  >
                    Confirm and Upload
                  </button>
                </>
              )}
            </section>

            <section id="user images">
              <h1 className="text-xl font-bold mb-4">Your Uploaded Images</h1>
              {imagesLoading ? (
                <Spinner />
              ) : error ? (
                <p style={{ color: 'red' }}>{error}</p>
              ) : userImages.length === 0 ? (
                <p>No images found for your account. Time to upload some!</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {userImages.map(({ thumbUrl, originalUrl }) => (
                    <img
                      key={thumbUrl}
                      src={thumbUrl}
                      alt="User Upload"
                      onClick={() => handleSelectExisting(thumbUrl, originalUrl)}
                      className="rounded-md object-cover w-full h-60 cursor-pointer transform transition active:scale-95 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
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
