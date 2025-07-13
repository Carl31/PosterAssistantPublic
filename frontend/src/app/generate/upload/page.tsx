/* eslint-disable @typescript-eslint/no-explicit-any */

// Page is for uploading user image

'use client'

import { motion } from 'framer-motion'
import { usePosterWizard, isStepAccessible } from '@/context/PosterWizardContext'
import { useState, useEffect, useCallback } from 'react'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { auth } from '@/firebase/client'
import { useRouter } from 'next/navigation'
import Cropper from 'react-easy-crop'
import { Area } from 'react-easy-crop'
import { getCroppedImg } from '@/utils/cropImage'
import Spinner from '@/components/Spinner'
import LoadingPage from '@/components/LoadingPage'

export default function UploadImageStep() {
  const { setPreviewUrl } = usePosterWizard()
  const { state } = usePosterWizard()
  const [image, setImage] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

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

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleBack = () => {
    setImage(null)
    setPreviewUrl(null)
    router.push('/generate/select')
  }

  useEffect(() => {
    if (!isStepAccessible('upload', state)) {
      console.log('No template selected. Redirecting.')
      router.push('/generate/select')
    }
  }, [state, router])

  // Helper to compress the image in a worker
  const compressImageInWorker = (file: Blob, options: any) => {
    return new Promise<Blob>((resolve, reject) => {
      const worker = new Worker(new URL('../../../../public/workers/imageCompressor.js', import.meta.url), {
        type: 'module',
      })

      worker.onmessage = (e) => {
        if (e.data.error) {
          reject(new Error(e.data.error))
        } else {
          const arrayBuffer = e.data
          const compressedBlob = new Blob([arrayBuffer], { type: 'image/jpeg' })
          resolve(compressedBlob)
        }
      }

      worker.onerror = (err) => {
        reject(err)
      }

      worker.postMessage({ file, options })
    })
  }

  // Main upload handler
  const handleImageUpload = async () => {
    if (!image || !auth.currentUser || !croppedAreaPixels) return

    setLoading(true)
    const user = auth.currentUser

    try {
      // ✅ 1. Crop the image
      const croppedBlob = await getCroppedImg(URL.createObjectURL(image), croppedAreaPixels)

      console.log('Cropped image size (before compression):', (croppedBlob.size / (1024 * 1024)).toFixed(2), 'MB')

      let finalBlob: Blob = croppedBlob

      // ✅ 2. If cropped image is over 4MB, compress it
      const croppedSizeMB = croppedBlob.size / (1024 * 1024)
      if (croppedSizeMB > 4) {
        const compressOptions = {
          maxSizeMB: 4,
          maxWidthOrHeight: 5000,
          useWebWorker: false,
          fileType: 'image/jpeg',
          initialQuality: 0.9,
        }

        finalBlob = await compressImageInWorker(croppedBlob, compressOptions)
        console.log('Compressed cropped image size:', (finalBlob.size / (1024 * 1024)).toFixed(2), 'MB')
      }

      // ✅ 3. Upload the cropped + compressed image
      const storage = getStorage()
      const storageRef = ref(storage, `user_uploads/${user.uid}/${image.name}`)
      const snapshot = await uploadBytes(storageRef, finalBlob)
      const downloadURL = await getDownloadURL(snapshot.ref)

      // ✅ 4. Save preview and navigate
      setPreviewUrl(downloadURL)
      router.push('/generate/identify')
    } catch (err) {
      console.error('Image crop/compress/upload failed:', err)
      alert('Image processing failed.')
      setLoading(false)
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
        {loading ? (
          <LoadingPage text="Uploading image..." />
        ) : (
          <span>
            <section id="upload image">
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

                  <button
                    onClick={handleImageUpload}
                    disabled={!image}
                    className="mt-4 bg-purple-600 text-white px-4 py-2 rounded"
                  >
                    Confirm and Upload
                  </button>
                </>
              )}

              {loading && <Spinner />}
            </section>

            <button
              onClick={handleBack}
              className="mt-6 bg-red-600 text-white px-4 py-2 rounded-md"
            >
              Back
            </button>
          </span>
        )}
      </div>
    </motion.div>
  )
}
