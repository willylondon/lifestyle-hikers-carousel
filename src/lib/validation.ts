import { z } from 'zod'
import { analysisResultSchema, slideResultSchema } from '@/lib/ai/schemas'

export const supportedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'] as const
export const INSTAGRAM_CAROUSEL_MAX_ITEMS = 20
export const MIN_CAROUSEL_PHOTOS = 5
export const MAX_DATA_URL_LENGTH = 8_000_000

const imageDataUrlSchema = z.string().max(MAX_DATA_URL_LENGTH).refine(
  (value) => /^data:image\/(jpeg|jpg|png|webp);base64,/.test(value),
  'Image data must be a supported base64 data URL.'
)

const safeUrlSchema = z.string().max(512).refine((value) => {
  if (!value.includes('://')) return true
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}, 'Only HTTPS URLs or plain filenames are allowed.')

export const projectInputSchema = z.object({
  title: z.string().trim().min(3, 'Project title is required').max(120),
  location: z.string().trim().min(2, 'Hike / location is required').max(120),
  notes: z.string().trim().min(20, 'Add enough hike notes for the story engine').max(5000),
})

export const photoInputSchema = z.object({
  id: z.string().max(128),
  originalName: z.string().max(255),
  url: safeUrlSchema,
  dataUrl: imageDataUrlSchema.optional(),
  thumbnailDataUrl: imageDataUrlSchema.optional(),
  width: z.number().positive().max(20_000),
  height: z.number().positive().max(20_000),
  mimeType: z.enum(supportedMimeTypes),
})

export const aiPhotoSchema = photoInputSchema.extend({
  analysis: analysisResultSchema.optional(),
})

export const analysedPhotoSchema = aiPhotoSchema.extend({
  dataUrl: imageDataUrlSchema,
})

export const analyzePhotoSchema = projectInputSchema.extend({
  photo: analysedPhotoSchema,
})

export const analyzeSchema = projectInputSchema.extend({
  photos: z.array(analysedPhotoSchema).min(1).max(INSTAGRAM_CAROUSEL_MAX_ITEMS),
})

export const generateCarouselSchema = projectInputSchema.extend({
  projectId: z.string().max(128).optional(),
  photos: z.array(aiPhotoSchema)
    .min(MIN_CAROUSEL_PHOTOS, `Add at least ${MIN_CAROUSEL_PHOTOS} photos`)
    .max(INSTAGRAM_CAROUSEL_MAX_ITEMS, `Instagram carousels support up to ${INSTAGRAM_CAROUSEL_MAX_ITEMS} photos or videos`),
  analyses: z.array(analysisResultSchema)
    .min(MIN_CAROUSEL_PHOTOS)
    .max(INSTAGRAM_CAROUSEL_MAX_ITEMS),
})

const slideTypeSchema = slideResultSchema.shape.slideType
const alignmentSchema = slideResultSchema.shape.textAlignment
const placementSchema = slideResultSchema.shape.textPlacement
const cropSchema = slideResultSchema.shape.cropPosition

export const appSlideSchema = z.object({
  id: z.string().max(128),
  order: z.number().int().min(0).max(INSTAGRAM_CAROUSEL_MAX_ITEMS - 1),
  photoId: z.string().max(128),
  type: slideTypeSchema,
  headline: z.string().max(500),
  body: z.string().max(2000),
  altText: z.string().max(2000),
  alignment: alignmentSchema,
  placement: placementSchema,
  overlay: z.number().min(0).max(100),
  shadow: z.boolean(),
  crop: cropSchema,
  cta: z.string().max(500).optional(),
  confidence: z.number().min(0).max(1),
  reasoningSummary: z.string().max(2000),
  editedFields: z.array(z.string().max(64)).max(20),
})

export const regenerateSlideSchema = z.object({
  projectTitle: z.string().min(1).max(120),
  location: z.string().min(1).max(120),
  notes: z.string().min(20).max(5000),
  photo: analysedPhotoSchema,
  currentSlide: appSlideSchema,
  target: z.enum(['slide', 'headline', 'body']),
})

export const captionSchema = z.object({
  title: z.string().max(120),
  location: z.string().max(120),
  notes: z.string().min(20).max(5000),
  slides: z.array(slideResultSchema).min(1).max(INSTAGRAM_CAROUSEL_MAX_ITEMS),
})

export function validatePhotoCount(count: number) {
  if (count < MIN_CAROUSEL_PHOTOS) return `Add at least ${MIN_CAROUSEL_PHOTOS} photos before generating a carousel.`
  if (count > INSTAGRAM_CAROUSEL_MAX_ITEMS) return `Use ${INSTAGRAM_CAROUSEL_MAX_ITEMS} photos or fewer in a single Instagram carousel.`
  return null
}

export function validateFile(file: File) {
  if (!supportedMimeTypes.includes(file.type as (typeof supportedMimeTypes)[number])) {
    return 'Unsupported format. Use JPG, JPEG, PNG, or WEBP.'
  }
  if (file.size > 12 * 1024 * 1024) {
    return 'Each photo must be 12 MB or smaller.'
  }
  return null
}
