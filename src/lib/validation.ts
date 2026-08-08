import { z } from 'zod'

export const supportedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'] as const

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

export const generateCarouselSchema = projectInputSchema.extend({
  projectId: z.string().optional(),
  photos: z.array(aiPhotoSchema).min(5, 'Add at least 5 photos').max(15, 'A carousel can use up to 15 photos'),
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
  slides: z.array(z.any()).min(1),
})

export function validatePhotoCount(count: number) {
  if (count < 5) return 'Add at least 5 photos before generating a carousel.'
  if (count > 15) return 'Use 15 photos or fewer in a single carousel.'
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
