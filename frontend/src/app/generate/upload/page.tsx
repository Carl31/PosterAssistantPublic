/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

'use client'

import { motion } from 'framer-motion'
import { usePosterWizard } from '@/context/PosterWizardContext'
import { useState, useCallback, useEffect, useRef } from 'react'
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  listAll,
} from 'firebase/storage'
import { auth } from '@/firebase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { getAuth, onAuthStateChanged, User } from 'firebase/auth'
import LoadingPage from '@/components/LoadingPage'
import Spinner from '@/components/Spinner'
import { Archivo_Black } from 'next/font/google'

const archivoBlack = Archivo_Black({ weight: '400', subsets: ['latin'] })

/* ------------------ Image helpers (hardened) ------------------ */

function safeCreateImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = async () => {
      try {
        if (img.decode) await img.decode().catch(() => { })
        resolve(img)
      } catch {
        resolve(img)
      }
    }
    img.onerror = reject
    img.src = url
  })
}

async function canvasToBlobSafe(
  canvas: HTMLCanvasElement,
  quality: number,
  retries = 2
): Promise<Blob> {
  for (let i = 0; i <= retries; i++) {
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, 'image/jpeg', quality)
    )
    if (blob) return blob
    await new Promise((r) => setTimeout(r, 200))
  }
  throw new Error('canvas.toBlob failed')
}

async function resizeImage(
  source: Blob,
  maxLongSide: number,
  quality: number
): Promise<Blob> {
  const url = URL.createObjectURL(source)
  try {
    const img = await safeCreateImage(url)
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
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas ctx null')
    ctx.drawImage(img, 0, 0, w, h)

    return await canvasToBlobSafe(canvas, quality)
  } finally {
    URL.revokeObjectURL(url)
  }
}

/* ------------------ Component ------------------ */

export default function UploadImageStep() {
  const { setuserImgDownloadUrl, setuserImgThumbDownloadUrl } = usePosterWizard()
  const [image, setImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
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

  const activePreviewRef = useRef<string | null>(null)

  /* ---------- Auth ---------- */

  useEffect(() => {
    const unsub = onAuthStateChanged(getAuth(), (u) => {
      setUser(u)
      setAuthLoading(false)
    })
    return () => unsub()
  }, [])

  /* ---------- Handlers ---------- */

  const handleSelectExisting = (thumbUrl: string, imageUrl: string) => {
    setuserImgDownloadUrl(imageUrl)
    setuserImgThumbDownloadUrl(thumbUrl)
    router.push('/generate/select')
  }

  const handleBack = () => {
    setImage(null)
    setuserImgDownloadUrl(null)
    router.push('/account/dashboard')
  }

  const handleRemoveImage = () => {
    setPreviewUrl(null)
    sessionStorage.removeItem('selectedUserImage')
    setImage(null)
  }

  /* ---------- Cleanup preview URLs safely ---------- */

  useEffect(() => {
    if (previewUrl) activePreviewRef.current = previewUrl
    return () => {
      if (activePreviewRef.current) {
        URL.revokeObjectURL(activePreviewRef.current)
        activePreviewRef.current = null
      }
    }
  }, [previewUrl])

  /* ---------- Fetch gallery ---------- */

  useEffect(() => {
    if (authLoading || !user) {
      setUserImages([])
      return
    }

    const fetchImages = async () => {
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

  /* ---------- Handlers ---------- */

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    setImage(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const handleImageUpload = async () => {
    if (!image || !previewUrl) return

    const currentUser = auth.currentUser
    if (!currentUser) return

    setLoading(true)

    const safeName = image.name
      .normalize('NFKD')
      .replace(/[^\w.-]+/g, '_')

    const ts = Date.now()
    const base = `${ts}_${safeName}`
    const fullPath = `user_uploads/${currentUser.uid}/${base}`
    const thumbPath = `user_uploads/${currentUser.uid}/${base.replace(
      /\.(?=[^.]+$)/,
      '_thumb.'
    )}`

    try {

      // can change image upload quality here (in the future, can make this variable dependant on user subscription tier):
      const { width, height } = await getImageDimensions(image)
      const longSide = Math.max(width, height)

      // ---------- Full image ----------
      const fullBlob =
        longSide > 2000
          ? await resizeImage(image, 2000, 0.85)
          : image

      // ---------- Thumbnail (conditional compression) ----------
      const thumbQuality = longSide > 2000 ? 0.75 : 0.85

      const thumbBlob = await resizeImage(
        fullBlob instanceof Blob ? fullBlob : image,
        800,
        thumbQuality
      )



      if (!thumbBlob || thumbBlob.size === 0) {
        throw new Error('Invalid thumbnail blob')
      }
      if (!fullBlob || fullBlob.size === 0) {
        throw new Error('Invalid user image blob')
      }

      const fullRef = ref(storage, fullPath)
      const thumbRef = ref(storage, thumbPath)

      await uploadBytes(fullRef, fullBlob)
      await uploadBytes(thumbRef, thumbBlob)

      const fullUrl = await getDownloadURL(fullRef)

      let thumbUrl: string | null = null
      for (let i = 0; i < 4; i++) {
        try {
          await new Promise((r) => setTimeout(r, 1500))
          thumbUrl = await getDownloadURL(thumbRef)
          break
        } catch { }
      }

      if (!thumbUrl) throw new Error('Thumbnail unavailable')

      setuserImgDownloadUrl(fullUrl)
      setuserImgThumbDownloadUrl(thumbUrl)
      sessionStorage.setItem('fullUrl', fullUrl)

      router.push('/generate/select?upload=true')
    } catch (e) {
      console.error('Upload failed:', e)
      alert('Image upload failed.')
    } finally {
      setLoading(false)
    }
  }

  async function getImageDimensions(blob: Blob): Promise<{ width: number; height: number }> {
    const url = URL.createObjectURL(blob)
    try {
      const img = await safeCreateImage(url)
      return { width: img.width, height: img.height }
    } finally {
      URL.revokeObjectURL(url)
    }
  }


  /* ---------- Render ---------- */

  if (authLoading) return <p>Authenticating...</p>
  if (!user) return <p>Please log in to see and upload images.</p>

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {loading ? (
        <LoadingPage text="Uploading image..." />
      ) : (

        <div className="p-4 sm:p-6 md:p-8 mx-auto w-full max-w-3xl">

          {/* Upload Section */}


          <section id="upload image" className="mb-8 mt-4">
            <div className="flex flex-col items-center 
                        relative p-[4px] 
                        bg-gradient-to-br from-cyan-500 to-blue-500
                        rounded-2xl mb-6">
              <div className="flex flex-col items-center bg-white rounded-xl px-6 py-6 w-full">
                <h1 className={`text-3xl sm:text-4xl md:text-5xl mb-2 text-blue-400 text-center ${archivoBlack.className}`}>
                  Choose an Image
                </h1>
                <p className="text-sm sm:text-base md:text-lg text-gray-800 text-center">
                  Upload your photo to turn it into a poster.
                </p>
              </div>
            </div>

            {!image ? (
              <>
                <label htmlFor="imageInput" className="cursor-pointer w-full max-w-md mx-auto">
                  <div className="bg-white border-3 border-black shadow-2xl rounded-xl px-6 py-4 flex flex-col items-center hover:shadow-xl transition">
                    <img className="w-9 h-9 mb-2" src="/svg/upload.svg" alt="Upload" />
                    <span className="text-gray-800 font-semibold text-sm">Upload image</span>
                    <input
                      id="imageInput"
                      type="file"
                      accept="image/*"
                      onChange={onSelectFile}
                      className="hidden"
                    />
                  </div>

                </label>
                <p className='text-gray-500 text-xs mt-3'>Tip: Clean, simple photos work best. Let the designs breathe!</p>
              </>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-full max-w-md bg-gray-100 rounded-xl overflow-hidden shadow-sm">
                  <div className="relative w-full aspect-[5/7]">
                    <img
                      src={previewUrl!}
                      alt="Preview"
                      className="absolute inset-0 w-full h-full object-contain"
                    />
                  </div>
                </div>
                <button
                  onClick={handleImageUpload}
                  disabled={!image}
                  className="w-full max-w-xs inline-flex justify-center gap-2 px-6 py-3 text-sm font-semibold text-white rounded-lg
                         bg-gradient-to-r from-cyan-500 to-blue-500 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-cyan-300 transition"
                >
                  Confirm and Upload
                </button>

                <button
                  onClick={handleRemoveImage}
                  disabled={!previewUrl}
                  className="text-sm text-gray-400 underline underline-offset-2 hover:text-gray-500 transition"
                >
                  Choose a different image
                </button>
              </div>
            )}
          </section>

          {/* User Images Section */}
          <section id="user images" className="mt-8">
            <h1 className="text-xl font-bold mb-4 text-black">Your uploaded images</h1>
            {imagesLoading ? (
              <Spinner />
            ) : error ? (
              <p className="text-red-500">{error}</p>
            ) : userImages.length === 0 ? (
              <p className="text-gray-700">No images found for your account. Time to upload some!</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {userImages.map(({ thumbUrl, originalUrl }) => (
                  <img
                    key={thumbUrl}
                    src={thumbUrl}
                    alt="User Upload"
                    onClick={() => handleSelectExisting(thumbUrl, originalUrl)}
                    className="rounded-xl object-cover w-full h-60 cursor-pointer transform transition active:scale-95 hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                  />
                ))}
              </div>
            )}
          </section>

          {/* Back Button */}
          <button
            onClick={handleBack}
            className="relative w-full inline-flex justify-center gap-2 px-6 py-3 mt-8 text-sm font-semibold rounded-lg
                       bg-white text-gray-800 shadow-md
                border border-gray-200
                hover:bg-gray-50
                disabled:opacity-50 mb-4"
          >

            Back
          </button>

        </div>
      )}

    </motion.div>
  )
}


// /* eslint-disable @typescript-eslint/no-explicit-any */
// 'use client'

// import { motion } from 'framer-motion'
// import { usePosterWizard } from '@/context/PosterWizardContext'
// import { useState, useCallback, useEffect } from 'react'
// import {
//   getStorage,
//   ref,
//   uploadBytes,
//   getDownloadURL,
//   listAll,
// } from 'firebase/storage'
// import { auth } from '@/firebase/client'
// import { useRouter, useSearchParams } from 'next/navigation'
// import Cropper from 'react-easy-crop'
// import { Area } from 'react-easy-crop'
// import { getAuth, onAuthStateChanged, User } from 'firebase/auth'
// import LoadingPage from '@/components/LoadingPage'
// import Spinner from '@/components/Spinner'
// import { Archivo_Black } from 'next/font/google'
// import Notification from '@/components/Notification'

// const archivoBlack = Archivo_Black({
//   weight: '400',
//   subsets: ['latin'],
// })

// // ------------------ Helper: resize + compress ------------------
// async function resizeImage(
//   file: Blob,
//   maxLongSide = 2000,
//   quality = 0.85
// ): Promise<Blob> {
//   const url = URL.createObjectURL(file)
//   const img = await createImage(url)
//   const ratio = img.width / img.height
//   let w = img.width
//   let h = img.height

//   if (Math.max(w, h) > maxLongSide) {
//     if (w > h) {
//       w = maxLongSide
//       h = Math.round(maxLongSide / ratio)
//     } else {
//       h = maxLongSide
//       w = Math.round(maxLongSide * ratio)
//     }
//   }

//   const canvas = document.createElement('canvas')
//   canvas.width = w
//   canvas.height = h
//   const ctx = canvas.getContext('2d')!
//   ctx.drawImage(img, 0, 0, w, h)
//   return new Promise((resolve, reject) => {
//     canvas.toBlob(
//       (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
//       'image/jpeg',
//       quality
//     )
//   })
// }

// function createImage(url: string): Promise<HTMLImageElement> {
//   return new Promise((resolve, reject) => {
//     const img = new Image()
//     img.crossOrigin = 'anonymous'
//     img.onload = () => {
//       img.decode().then(() => resolve(img)).catch(reject)
//     }
//     img.onerror = (err) => reject(err)
//     img.src = url
//   })
// }

// // ------------------ Helper: crop ------------------
// async function getCroppedImg(
//   imageSrc: string,
//   croppedAreaPixels: Area
// ): Promise<Blob> {
//   const image = await createImage(imageSrc)
//   const canvas = document.createElement('canvas')
//   const ctx = canvas.getContext('2d')
//   if (!ctx) throw new Error('Canvas ctx failed')
//   const { x, y, width, height } = croppedAreaPixels
//   canvas.width = width
//   canvas.height = height
//   ctx.fillStyle = '#fff'
//   ctx.fillRect(0, 0, width, height)
//   ctx.drawImage(image, x, y, width, height, 0, 0, width, height)
//   return new Promise((resolve, reject) => {
//     canvas.toBlob(
//       (b) => (b ? resolve(b) : reject(new Error('crop blob fail'))),
//       'image/jpeg',
//       0.95
//     )
//   })
// }

// // ------------------ Component ------------------
// export default function UploadImageStep() {
//   const { setuserImgDownloadUrl, setuserImgThumbDownloadUrl } = usePosterWizard()
//   const [image, setImage] = useState<File | null>(null)
//   const [previewUrl, setPreviewUrl] = useState<string | null>(null)
//   const [loading, setLoading] = useState(false)
//   const [crop, setCrop] = useState({ x: 0, y: 0 })
//   const [zoom, setZoom] = useState(1)
//   const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
//   const [user, setUser] = useState<User | null>(null)
//   const [authLoading, setAuthLoading] = useState(true)
//   const [userImages, setUserImages] = useState<
//     { thumbUrl: string; originalUrl: string }[]
//   >([])
//   const [imagesLoading, setImagesLoading] = useState(false)
//   const [error, setError] = useState<string | null>(null)
//   const router = useRouter()
//   const storage = getStorage()
//   const searchParams = useSearchParams()
//   const cameFromSelectPage = searchParams?.get('imageUploaded') === 'true'

//   // ---------- Auth ----------
//   useEffect(() => {
//     const auth = getAuth()
//     const unsub = onAuthStateChanged(auth, (u) => {
//       setUser(u)
//       setAuthLoading(false)
//     })
//     return () => unsub()
//   }, [])

//   // ---------- Reuse preview URL ----------
//   useEffect(() => {
//     return () => {
//       if (previewUrl) URL.revokeObjectURL(previewUrl)
//     }
//   }, [previewUrl])

//   // ---------- Fetch gallery ----------
//   useEffect(() => {
//     const fetchImages = async () => {
//       if (authLoading || !user) {
//         setUserImages([])
//         return
//       }
//       setImagesLoading(true)
//       setError(null)
//       try {
//         const imagesRef = ref(storage, `user_uploads/${user.uid}/`)
//         const res = await listAll(imagesRef)
//         const urls = await Promise.all(
//           res.items
//             .filter((i) => i.name.includes('_thumb'))
//             .map(async (thumbRef) => {
//               const thumbUrl = await getDownloadURL(thumbRef)
//               const originalName = thumbRef.name.replace('_thumb', '')
//               const originalRef = ref(
//                 storage,
//                 `user_uploads/${user.uid}/${originalName}`
//               )
//               const originalUrl = await getDownloadURL(originalRef)
//               return { thumbUrl, originalUrl, name: originalName }
//             })
//         )
//         urls.sort((a, b) => {
//           const A = parseInt(a.name.split('_')[0])
//           const B = parseInt(b.name.split('_')[0])
//           return B - A
//         })
//         setUserImages(urls)
//       } catch (e: any) {
//         setError(`Failed to load images: ${e.message}`)
//         setUserImages([])
//       } finally {
//         setImagesLoading(false)
//       }
//     }

//     fetchImages()
//     if (cameFromSelectPage) {
//       const t = setTimeout(fetchImages, 3000)
//       return () => clearTimeout(t)
//     }
//   }, [authLoading, user])

//   // ---------- Handlers ----------
//   const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0]
//     if (!file) return
//     if (!file.type.startsWith('image/')) {
//       alert('Please select an image file.')
//       return
//     }
//     setImage(file)
//     const url = URL.createObjectURL(file)
//     setPreviewUrl(url)
//   }

//   const handleSelectExisting = (thumbUrl: string, imageUrl: string) => {
//     setuserImgDownloadUrl(imageUrl)
//     setuserImgThumbDownloadUrl(thumbUrl)
//     router.push('/generate/select')
//   }

//   const onCropComplete = useCallback(
//     (_c: Area, p: Area) => setCroppedAreaPixels(p),
//     []
//   )

//   const handleBack = () => {
//     setImage(null)
//     setuserImgDownloadUrl(null)
//     router.push('/account/dashboard')
//   }

//   // ---------- Upload ----------
//   const handleImageUpload = async () => {
//     if (!image || !auth.currentUser || !croppedAreaPixels || !previewUrl) return

//     setLoading(true)
//     const user = auth.currentUser

//     try {
//       const cropped = await getCroppedImg(previewUrl, croppedAreaPixels)

//       const [fullBlob, thumbBlob] = await Promise.all([
//         resizeImage(cropped, 2000, 0.85),
//         resizeImage(cropped, 800, 0.7),
//       ])

//       const ts = Date.now()
//       const base = `${ts}_${image.name.replace(/\s+/g, '_')}`
//       const fullPath = `user_uploads/${user.uid}/${base}`
//       const thumbPath = `user_uploads/${user.uid}/${base.replace(/\.(?=[^.]+$)/, '_thumb.')}`

//       const fullRef = ref(storage, fullPath)
//       const thumbRef = ref(storage, thumbPath)

//       // Upload both — only need the fullSnap
//       const [fullSnap] = await Promise.all([
//         uploadBytes(fullRef, fullBlob),
//         uploadBytes(thumbRef, thumbBlob),
//       ])

//       const fullUrl = await getDownloadURL(fullSnap.ref)
//       setuserImgDownloadUrl(fullUrl)

//       // Retry loop for thumbnail (old working behaviour)
//       let retries = 0
//       const maxRetries = 3
//       const delay = 2000

//       while (true) {
//         try {
//           await new Promise(r => setTimeout(r, delay))
//           const thumbUrl = await getDownloadURL(thumbRef)
//           setuserImgThumbDownloadUrl(thumbUrl)
//           break
//         } catch (e) {
//           retries++
//           if (retries > maxRetries) throw e
//         }
//       }

//       router.push('/generate/select?upload=true')
//     } catch (e) {
//       console.error('Upload failed:', e)
//       alert('Image upload failed.')
//       throw new Error('Image upload failed: ' + e);
//     }
//   }





//   // const handleImageUpload = async () => {
//   //   if (!image || !auth.currentUser || !croppedAreaPixels || !previewUrl) return
//   //   setLoading(true)
//   //   const user = auth.currentUser
//   //   try {
//   //     const cropped = await getCroppedImg(previewUrl, croppedAreaPixels)
//   //     const [fullBlob, thumbBlob] = await Promise.all([
//   //       resizeImage(cropped, 2000, 0.85),
//   //       resizeImage(cropped, 800, 0.7),
//   //     ])
//   //     const ts = Date.now()
//   //     const base = `${ts}_${image.name.replace(/\s+/g, '_')}`
//   //     const fullRef = ref(storage, `user_uploads/${user.uid}/${base}`)
//   //     const thumbRef = ref(
//   //       storage,
//   //       `user_uploads/${user.uid}/${base.replace(/\.(?=[^.]+$)/, '_thumb.')}`
//   //     )

//   //     const [fullSnap, thumbSnap] = await Promise.all([
//   //       uploadBytes(fullRef, fullBlob),
//   //       uploadBytes(thumbRef, thumbBlob),
//   //     ])

//   //     const [fullUrl, thumbUrl] = await Promise.all([
//   //       getDownloadURL(fullSnap.ref),
//   //       getDownloadURL(thumbSnap.ref),
//   //     ])

//   //     setuserImgDownloadUrl(fullUrl)
//   //     setuserImgThumbDownloadUrl(thumbUrl)
//   //     router.push('/generate/select?upload=true')
//   //   } catch (e) {
//   //     console.error('Upload failed', e)
//   //     alert('Image upload failed.')
//   //   }
//   // }

//   // ---------- Render ----------
//   if (authLoading) return <p>Authenticating...</p>
//   if (!user) return <p>Please log in to see and upload images.</p>

//   return (
//     <motion.div
//       initial={{ opacity: 0, y: 10 }}
//       animate={{ opacity: 1, y: 0 }}
//       exit={{ opacity: 0, y: -10 }}
//       transition={{ duration: 0.3 }}
//     >
//       <div className="p-2 mx-auto">
//         <Notification />
//         {loading ? (
//           <LoadingPage text="Uploading image..." />
//         ) : (
//           <>
//             <section id="upload image" className="mb-8 mt-5">
//               <div className="border-3 border-blue-400 max-w-md mx-auto p-4 px-4 py-2 mb-12 flex flex-col items-center shadow-[0_0_14px_rgba(59,130,246,0.7)]">
//                 <h1 className={`text-2xl text-gray-200 ${archivoBlack.className}`}>
//                   Choose an image
//                 </h1>
//               </div>

//               <h1 className="text-xl font-bold mb-4">Upload Your Image</h1>
//               {!image ? (
//                 <label htmlFor="imageInput" className="cursor-pointer text-black">
//                   <div className="bg-blue-300 text-black px-4 py-4 rounded-xl flex flex-col items-center">
//                     <img
//                       className="w-9 h-9 mt-2 mb-2"
//                       src="/svg/upload.svg"
//                       alt="uploadSVG"
//                     />
//                     Upload Image
//                     <input
//                       id="imageInput"
//                       type="file"
//                       accept="image/*"
//                       onChange={onSelectFile}
//                       className="hidden"
//                     />
//                   </div>
//                 </label>
//               ) : (
//                 <>
//                   <div className="relative w-full h-140 bg-gray-100">
//                     <Cropper
//                       image={previewUrl!}
//                       crop={crop}
//                       zoom={zoom}
//                       aspect={5 / 7}
//                       onCropChange={setCrop}
//                       onZoomChange={setZoom}
//                       onCropComplete={onCropComplete}
//                     />
//                   </div>
//                   <button
//                     onClick={handleImageUpload}
//                     disabled={!image}
//                     className="mt-4 text-white bg-gradient-to-br from-purple-600 to-blue-500 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2"
//                   >
//                     Confirm and Upload
//                   </button>
//                 </>
//               )}
//             </section>

//             <section id="user images">
//               <h1 className="text-xl font-bold mb-4">Your Uploaded Images</h1>
//               {imagesLoading ? (
//                 <Spinner />
//               ) : error ? (
//                 <p style={{ color: 'red' }}>{error}</p>
//               ) : userImages.length === 0 ? (
//                 <p>No images found for your account. Time to upload some!</p>
//               ) : (
//                 <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4">
//                   {userImages.map(({ thumbUrl, originalUrl }) => (
//                     <img
//                       key={thumbUrl}
//                       src={thumbUrl}
//                       alt="User Upload"
//                       onClick={() => handleSelectExisting(thumbUrl, originalUrl)}
//                       className="rounded-md object-cover w-full h-60 cursor-pointer transform transition active:scale-95 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
//                     />
//                   ))}
//                 </div>
//               )}
//             </section>

//             <button onClick={handleBack} className="mt-8 relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-pink-500 to-orange-400 group-hover:from-pink-500 group-hover:to-orange-400 hover:text-white dark:text-white focus:ring-4 focus:outline-none focus:ring-pink-200 dark:focus:ring-pink-800">
//               <span className="relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-transparent group-hover:dark:bg-transparent">
//                 Back
//               </span>
//             </button>
//           </>
//         )}
//       </div>
//     </motion.div>
//   )
// }
