import JSZip from 'jszip'
import { brandConfig, editorialStyle } from '@/config/brand'
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
  const words = text.trim().split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (!current || ctx.measureText(candidate).width <= maxWidth) current = candidate
    else { lines.push(current); current = word }
  }
  if (current) lines.push(current)
  return lines.slice(0, maxLines).map((line, index) => ({ line, y: y + index * lineHeight }))
}

function drawTrackedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, tracking: number) {
  let cursor = x
  for (const character of text) {
    ctx.fillText(character, cursor, y)
    cursor += ctx.measureText(character).width + tracking
  }
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

function isRightPlacement(slide: Slide) { return slide.placement.endsWith('right') }
function contentStartY(slide: Slide) {
  if (slide.placement.startsWith('top')) return 205
  if (slide.placement.startsWith('bottom')) return 710
  return 410
}

function drawEditorialOverlay(ctx: CanvasRenderingContext2D, slide: Slide) {
  const cw = brandConfig.canvasWidth
  const ch = brandConfig.canvasHeight
  const alpha = Math.min(0.76, Math.max(0.36, slide.overlay / 100))
  const right = isRightPlacement(slide)
  const gradient = ctx.createLinearGradient(right ? cw : 0, 0, right ? 0 : cw, 0)
  gradient.addColorStop(0, `rgba(5,7,6,${alpha})`)
  gradient.addColorStop(0.32, `rgba(5,7,6,${alpha * 0.72})`)
  gradient.addColorStop(0.60, `rgba(5,7,6,${alpha * 0.16})`)
  gradient.addColorStop(0.78, 'rgba(5,7,6,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, cw, ch)
  const vignette = ctx.createLinearGradient(0, 0, 0, ch)
  vignette.addColorStop(0, 'rgba(5,7,6,0.16)')
  vignette.addColorStop(0.45, 'rgba(5,7,6,0)')
  vignette.addColorStop(1, 'rgba(5,7,6,0.14)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, cw, ch)
}

export async function renderSlideToBlob(slide: Slide, photo: PhotoAsset, project: Project) {
  const canvas = document.createElement('canvas')
  canvas.width = brandConfig.canvasWidth
  canvas.height = brandConfig.canvasHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas rendering is unavailable.')
  const image = await loadImage(photo.dataUrl || photo.url)
  drawImageCover(ctx, image, slide.crop)
  drawEditorialOverlay(ctx, slide)

  const margin = brandConfig.safeMargin
  const right = isRightPlacement(slide)
  const x = right ? brandConfig.canvasWidth - margin : margin
  const maxWidth = editorialStyle.textColumnWidth
  ctx.textAlign = right ? 'right' : 'left'
  ctx.textBaseline = 'alphabetic'

  ctx.save()
  ctx.textAlign = 'left'
  ctx.fillStyle = brandConfig.textColor
  ctx.font = `600 ${brandConfig.metaSize}px Inter, Arial, sans-serif`
  drawTrackedText(ctx, brandConfig.brandName, margin, editorialStyle.brandTop, editorialStyle.brandTracking)
  ctx.restore()

  let headlineSize = brandConfig.headlineSize
  if (slide.headline.length > 72) headlineSize = 66
  if (slide.headline.length > 100) headlineSize = 58
  ctx.fillStyle = brandConfig.textColor
  ctx.font = `700 ${headlineSize}px Inter, Arial, sans-serif`
  if (slide.shadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.38)'
    ctx.shadowBlur = 18
    ctx.shadowOffsetY = 5
  }
  const lineHeight = Math.round(headlineSize * 1.02)
  const headlineLines = drawWrappedText(ctx, slide.headline, x, contentStartY(slide), maxWidth, lineHeight, 5)
  headlineLines.forEach(({ line, y }) => ctx.fillText(line, x, y, maxWidth))
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0

  const lastHeadlineY = headlineLines.at(-1)?.y ?? contentStartY(slide)
  const ruleY = lastHeadlineY + editorialStyle.ruleGapTop
  const ruleStart = right ? x - editorialStyle.ruleWidth : x
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  ctx.fillRect(ruleStart, ruleY, editorialStyle.ruleWidth, editorialStyle.ruleThickness)
  const bodyY = ruleY + editorialStyle.ruleGapBottom + brandConfig.bodySize

  if (slide.body) {
    ctx.font = `400 ${brandConfig.bodySize}px Inter, Arial, sans-serif`
    ctx.fillStyle = brandConfig.supportingTextColor
    const bodyLines = drawWrappedText(ctx, slide.body, x, bodyY, maxWidth, Math.round(brandConfig.bodySize * 1.42), 5)
    bodyLines.forEach(({ line, y }) => ctx.fillText(line, x, y, maxWidth))
    if (slide.cta) {
      const lastBodyY = bodyLines.at(-1)?.y ?? bodyY
      ctx.font = `700 ${brandConfig.bodySize}px Inter, Arial, sans-serif`
      ctx.fillStyle = brandConfig.textColor
      ctx.fillText(slide.cta, x, lastBodyY + 72, maxWidth)
      ctx.fillStyle = editorialStyle.accentColor
      ctx.fillText(brandConfig.handle, x, lastBodyY + 116, maxWidth)
    }
  } else if (slide.cta) {
    ctx.font = `700 ${brandConfig.bodySize}px Inter, Arial, sans-serif`
    ctx.fillStyle = brandConfig.textColor
    ctx.fillText(slide.cta, x, bodyY, maxWidth)
    ctx.fillStyle = editorialStyle.accentColor
    ctx.fillText(brandConfig.handle, x, bodyY + 44, maxWidth)
  }

  ctx.save()
  ctx.textAlign = 'left'
  ctx.font = `500 15px Inter, Arial, sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,0.34)'
  const pageNumber = `${String(slide.order + 1).padStart(2, '0')} / ${String(project.slides.length).padStart(2, '0')}`
  ctx.fillText(pageNumber, margin, brandConfig.canvasHeight - 48)
  ctx.restore()

  if (slide.type !== 'cta' && project.location) {
    ctx.textAlign = 'right'
    ctx.font = `500 16px Inter, Arial, sans-serif`
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    ctx.fillText(project.location.toUpperCase(), brandConfig.canvasWidth - margin, brandConfig.canvasHeight - 48)
  }

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
  let exportedSlides = 0
  for (const slide of [...project.slides].sort((a, b) => a.order - b.order)) {
    const photo = photosById.get(slide.photoId)
    if (!photo) throw new Error(`Slide ${slide.order + 1} references a missing photo. Regenerate the carousel before exporting.`)
    const blob = await renderSlideToBlob(slide, photo, project)
    zip.file(`slide-${String(slide.order + 1).padStart(2, '0')}.jpg`, blob)
    exportedSlides += 1
  }
  if (exportedSlides !== project.slides.length) throw new Error('Export integrity check failed: not every slide was rendered.')
  zip.file('caption.txt', project.caption)
  zip.file('alt-text.txt', [...project.slides].sort((a, b) => a.order - b.order).map((slide, index) => `Slide ${index + 1}: ${slide.altText}`).join('\n\n'))
  zip.file('README.txt', `Lifestyle Hikers Carousel Creator\n\nProject: ${project.title}\nLocation: ${project.location}\nSlides: ${project.slides.length}\nCanvas: ${brandConfig.canvasWidth}x${brandConfig.canvasHeight}\n`)
  zip.file('metadata.json', JSON.stringify({
    project: { id: project.id, title: project.title, location: project.location, notes: project.notes, status: project.status, createdAt: project.createdAt, updatedAt: project.updatedAt },
    photos: project.photos.map(({ id, originalName, width, height, mimeType, analysis }) => ({ id, originalName, width, height, mimeType, analysis })),
    slides: project.slides,
    caption: project.caption,
    hashtags: project.hashtags,
    keywords: project.keywords,
    brand: brandConfig,
    generatedAt: new Date().toISOString(),
  }, null, 2))
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
