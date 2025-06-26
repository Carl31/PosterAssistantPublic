 

import { Area } from 'react-easy-crop';

export const getCroppedImg = async (
  imageSrc: string,
  croppedAreaPixels: Area
): Promise<File> => {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not get canvas context')

  const cropWidth = croppedAreaPixels.width;
  const cropHeight = croppedAreaPixels.height;

  canvas.width = cropWidth
  canvas.height = cropHeight

  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // console.log(croppedAreaPixels.x, croppedAreaPixels.y, croppedAreaPixels.width, croppedAreaPixels.height)
  ctx.drawImage(
    image,
    croppedAreaPixels.x,
    croppedAreaPixels.y,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
    0,
    0,
    croppedAreaPixels.width,
    croppedAreaPixels.height
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('Canvas is empty'))
      resolve(new File([blob], 'cropped.jpg', { type: 'image/jpeg' }))
    }, 'image/jpeg')
  })
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

     img.onload = () => {
      // Ensure it's decoded (not just loaded)
      img.decode().then(() => resolve(img)).catch(reject)
    }
    img.onerror = (err) => reject(new Error('Failed to load image: ' + err))

    // ✅ Set src after assigning handlers
    img.src = url
  })
}

