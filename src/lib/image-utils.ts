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

export async function makeThumbnail(dataUrl: string, maxEdge = 480) {
  const image = new Image()
  image.src = dataUrl
  await image.decode()

  const ratio = image.width > image.height ? maxEdge / image.width : maxEdge / image.height
  const width = Math.round(image.width * ratio)
  const height = Math.round(image.height * ratio)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return dataUrl
  ctx.drawImage(image, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', 0.84)
}
