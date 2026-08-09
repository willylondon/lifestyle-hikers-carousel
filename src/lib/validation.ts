import { z } from 'zod'
import { analysisResultSchema } from '@/lib/ai/schemas'

export const supportedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'] as const
export const INSTAGRAM_CAROUSEL_MAX_ITEMS = 20
export const MIN_CAROUSEL_PHOTOS = 5

export const projectInputSchema = z.object({
  title: z.string().trim().min(3, 'Project title is required').max(120),
  location: z.string().trim().min(2, 'Hike / location is required').max(120),
  notes: z.string().trim().min(20, 'Add enough hike notes for the story engine').max(5000),
})

export const photoInputSchema = z.object({
  id: z.string(),
  originalName: z.string(),
  url: z.string(),
  dataUrl: z.string().optional(),
  thumbnailDataUrl: z.string().optional(),
  width: z.number().positive(),
  height: z.number().positive(),
  mimeType: z.enum(supportedMimeTypes),
})

export const aiPhotoSchema = photoInputSchema.extend({
  analysis: z.any().optional(),
})

export const analyzePhotoSchema = projectInputSchema.extend({
  photo: aiPhotoSchema,
})

export const generateCarouselSchema = projectInputSchema.extend({
  projectId: z.string().optional(),
  photos: z.array(aiPhotoSchema)
    .min(MIN_CAROUSEL_PHOTOS, `Add at least ${MIN_CAROUSEL_PHOTOS} photos`)
    .max(INSTAGRAM_CAROUSEL_MAX_ITEMS, `Instagram carousels support up to ${INSTAGRAM_CAROUSEL_MAX_ITEMS} photos or videos`),
  analyses: z.array(analysisResultSchema)
    .min(MIN_CAROUSEL_PHOTOS)
    .max(INSTAGRAM_CAROUSEL_MAX_ITEMS)
    .optional(),
})

export const regenerateSlideSchema = z.object({
  projectTitle: z.string().min(1),
  location: z.string().min(1),
  notes: z.string().max(5000),
  photo: aiPhotoSchema,
  currentSlide: z.any(),
  target: z.enum(['slide', 'headline', 'body']),
})

export const captionSchema = z.object({
  title: z.string(),
  location: z.string(),
  notes: z.string(),
  slides: z.array(z.any()).min(1).max(INSTAGRAM_CAROUSEL_MAX_ITEMS),
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
