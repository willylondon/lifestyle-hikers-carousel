export async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}.`))
    reader.readAsDataURL(file)
  })
}

export async function imageDimensions(dataUrl: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve({ width: image.width, height: image.height })
    image.onerror = () => reject(new Error('Image dimensions could not be read.'))
    image.src = dataUrl
  })
}

async function resizeImage(dataUrl: string, maxEdge: number, quality: number) {
  const image = new Image()
  image.src = dataUrl
  await image.decode()

  const largestEdge = Math.max(image.width, image.height)
  const ratio = largestEdge > maxEdge ? maxEdge / largestEdge : 1
  const width = Math.max(1, Math.round(image.width * ratio))
  const height = Math.max(1, Math.round(image.height * ratio))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return dataUrl
  ctx.drawImage(image, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', quality)
}

export async function makeProjectImage(dataUrl: string) {
  return resizeImage(dataUrl, 2048, 0.88)
}

export async function makeAnalysisImage(dataUrl: string) {
  return resizeImage(dataUrl, 1280, 0.72)
}

export async function makeThumbnail(dataUrl: string, maxEdge = 480) {
  return resizeImage(dataUrl, maxEdge, 0.82)
}
