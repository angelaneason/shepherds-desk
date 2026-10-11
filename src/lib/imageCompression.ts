/**
 * Compresses and resizes a user-selected photo on the client (browser) using HTML5 Canvas.
 * Reduces 10MB+ phone camera images to ~200KB-400KB while preserving sharp text readability for OCR.
 */
export async function compressImageForOcr(
  file: File,
  maxDimension = 1600,
  quality = 0.82
): Promise<File> {
  // If it's not an image (e.g. PDF, Word, text), return as-is
  if (
    !file.type.startsWith('image/') ||
    file.type === 'image/svg+xml' ||
    file.name.toLowerCase().endsWith('.pdf')
  ) {
    return file
  }

  // If already under 400KB, skip compression
  if (file.size < 400 * 1024) {
    return file
  }

  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img

      // Scale dimensions down to maxDimension
      if (width > height) {
        if (width > maxDimension) {
          height = Math.round((height * maxDimension) / width)
          width = maxDimension
        }
      } else {
        if (height > maxDimension) {
          width = Math.round((width * maxDimension) / height)
          height = maxDimension
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        resolve(file)
        return
      }

      // Draw image to canvas
      ctx.drawImage(img, 0, 0, width, height)

      // Export as compressed JPEG
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file)
            return
          }
          const compressedFile = new File(
            [blob],
            file.name.replace(/\.[^/.]+$/, '') + '.jpg',
            {
              type: 'image/jpeg',
              lastModified: Date.now(),
            }
          )
          resolve(compressedFile)
        },
        'image/jpeg',
        quality
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(file)
    }

    img.src = url
  })
}
