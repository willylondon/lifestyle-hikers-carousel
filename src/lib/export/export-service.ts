import JSZip from 'jszip'
import { brandConfig } from '@/config/brand'
import type { PhotoAsset, Project, Slide } from '@/types'

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })
}

function drawWrappedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number) {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate
    } else {
      lines.push(current)
      current = word
    }
  }

  if (current) lines.push(current)
  return lines.slice(0, maxLines).map((line, index) => ({ line, y: y + index * lineHeight }))
}

function computeTextOrigin(slide: Slide) {
  const margin = brandConfig.safeMargin
  const width = brandConfig.canvasWidth
  const height = brandConfig.canvasHeight
  const map = {
    'top-left': { x: margin, y: margin + 10 },
    'top-center': { x: width / 2, y: margin + 10 },
    'top-right': { x: width - margin, y: margin + 10 },
    'center-left': { x: margin, y: height / 2 - 120 },
    center: { x: width / 2, y: height / 2 - 120 },
    'center-right': { x: width - margin, y: height / 2 - 120 },
    'bottom-left': { x: margin, y: height - 310 },
    'bottom-center': { x: width / 2, y: height - 310 },
    'bottom-right': { x: width - margin, y: height - 310 },
  } satisfies Record<Slide['placement'], { x: number; y: number }>
  return map[slide.placement]
}

function drawImageCover(ctx: CanvasRenderingContext2D, image: HTMLImageElement, crop: Slide['crop']) {
  const cw = brandConfig.canvasWidth
  const ch = brandConfig.canvasHeight
  const scale = Math.max(cw / image.width, ch / image.height)
  const drawW = image.width * scale
  const drawH = image.height * scale

  let dx = (cw - drawW) / 2
  let dy = (ch - drawH) / 2
  if (crop === 'top') dy = 0
  if (crop === 'bottom') dy = ch - drawH
  if (crop === 'left') dx = 0
  if (crop === 'right') dx = cw - drawW

  ctx.drawImage(image, dx, dy, drawW, drawH)
}

export async function renderSlideToBlob(slide: Slide, photo: PhotoAsset, project: Project) {
  const canvas = document.createElement('canvas')
  canvas.width = brandConfig.canvasWidth
  canvas.height = brandConfig.canvasHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas rendering is unavailable.')

  const image = await loadImage(photo.dataUrl || photo.url)
  drawImageCover(ctx, image, slide.crop)

  const gradient = ctx.createLinearGradient(0, 0, 0, brandConfig.canvasHeight)
  gradient.addColorStop(0, `rgba(8,10,9,${slide.overlay / 180})`)
  gradient.addColorStop(1, `rgba(8,10,9,${slide.overlay / 100})`)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, brandConfig.canvasWidth, brandConfig.canvasHeight)

  const origin = computeTextOrigin(slide)
  const maxWidth = brandConfig.canvasWidth - brandConfig.safeMargin * 2
  ctx.fillStyle = brandConfig.textColor
  ctx.textAlign = slide.alignment
  if (slide.shadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.42)'
    ctx.shadowBlur = 20
    ctx.shadowOffsetY = 6
  }

  let headlineSize = brandConfig.headlineSize
  if (slide.headline.length > 75) headlineSize = 48
  ctx.font = `700 ${headlineSize}px Inter, system-ui, sans-serif`
  const headlineLines = drawWrappedText(ctx, slide.headline, origin.x, origin.y, maxWidth, headlineSize + 8, 4)
  headlineLines.forEach(({ line, y }) => ctx.fillText(line, origin.x, y, maxWidth))

  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0
  ctx.font = `400 ${brandConfig.bodySize}px Inter, system-ui, sans-serif`
  ctx.fillStyle = brandConfig.supportingTextColor
  const bodyStart = headlineLines.at(-1)?.y ? headlineLines.at(-1)!.y + 58 : origin.y + 80
  const bodyLines = drawWrappedText(ctx, slide.body, origin.x, bodyStart, maxWidth, brandConfig.bodySize + 10, 4)
  bodyLines.forEach(({ line, y }) => ctx.fillText(line, origin.x, y, maxWidth))

  ctx.font = `600 ${brandConfig.metaSize}px Inter, system-ui, sans-serif`
  ctx.fillStyle = brandConfig.supportingTextColor
  ctx.fillText(project.title.toUpperCase(), origin.x, brandConfig.canvasHeight - brandConfig.safeMargin + 4, maxWidth)
  ctx.textAlign = 'right'
  ctx.fillText(brandConfig.handle, brandConfig.canvasWidth - brandConfig.safeMargin, brandConfig.canvasHeight - brandConfig.safeMargin + 4)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('Failed to export slide.'))
      resolve(blob)
    }, 'image/jpeg', 0.94)
  })
}

export async function exportProjectPackage(project: Project) {
  const zip = new JSZip()
  const photosById = new Map(project.photos.map((photo) => [photo.id, photo]))

  for (const slide of [...project.slides].sort((a, b) => a.order - b.order)) {
    const photo = photosById.get(slide.photoId)
    if (!photo) continue
    const blob = await renderSlideToBlob(slide, photo, project)
    zip.file(`slide-${String(slide.order + 1).padStart(2, '0')}.jpg`, blob)
  }

  zip.file('caption.txt', project.caption)
  zip.file(
    'alt-text.txt',
    [...project.slides]
      .sort((a, b) => a.order - b.order)
      .map((slide, index) => `Slide ${index + 1}: ${slide.altText}`)
      .join('\n\n')
  )
  zip.file(
    'README.txt',
    `Lifestyle Hikers Carousel Creator\n\nProject: ${project.title}\nLocation: ${project.location}\nSlides: ${project.slides.length}\nCanvas: ${brandConfig.canvasWidth}x${brandConfig.canvasHeight}\n`
  )
  zip.file(
    'metadata.json',
    JSON.stringify(
      {
        project,
        slides: project.slides,
        caption: project.caption,
        hashtags: project.hashtags,
        keywords: project.keywords,
        brand: brandConfig,
        generatedAt: new Date().toISOString(),
      },
      null,
      2
    )
  )

  const archive = await zip.generateAsync({ type: 'blob' })
  const safeName = project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const url = URL.createObjectURL(archive)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `lifestyle-hikers-${safeName}-carousel.zip`
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)

  return archive
}
