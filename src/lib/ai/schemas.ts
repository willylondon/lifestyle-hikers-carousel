import { z } from 'zod'

export const analysisResultSchema = z.object({
  primarySubject: z.string(),
  environment: z.string(),
  apparentActivity: z.string(),
  mood: z.string(),
  foreground: z.string(),
  middleGround: z.string(),
  background: z.string(),
  dominantColors: z.array(z.string()).min(1),
  visualFocalPoint: z.string(),
  negativeSpace: z.string(),
  likelyTextSafeRegions: z.array(z.enum(['top-left','top-center','top-right','center-left','center','center-right','bottom-left','bottom-center','bottom-right'])).min(1),
  facesOrImportantPeople: z.string(),
  environmentalFeatures: z.array(z.string()).min(1),
  orientation: z.enum(['portrait', 'landscape', 'square']),
  storytellingUsefulness: z.string(),
  visualStrength: z.number().min(0).max(1),
  recommendedRole: z.enum(['cover', 'middle', 'context', 'cta']),
  accessibilityDescription: z.string(),
  notesRelevance: z.string(),
  uncertaintyNotes: z.array(z.string()).optional(),
})

export const slideResultSchema = z.object({
  id: z.string(),
  imageId: z.string(),
  slideType: z.enum(['hook','observation','lesson','nature','culture','history','challenge','transition','reflection','cta']),
  headline: z.string().min(1),
  body: z.string(),
  altText: z.string().min(1),
  textAlignment: z.enum(['left', 'center', 'right']),
  textPlacement: z.enum(['top-left','top-center','top-right','center-left','center','center-right','bottom-left','bottom-center','bottom-right']),
  overlayStrength: z.number().min(0).max(65),
  textShadow: z.boolean(),
  cropPosition: z.enum(['center', 'top', 'bottom', 'left', 'right']),
  cta: z.string().optional(),
  confidence: z.number().min(0).max(1),
  reasoningSummary: z.string().min(1),
})

export const captionResultSchema = z.object({
  caption: z.string().min(1),
  hashtags: z.array(z.string()),
  keywords: z.array(z.string()),
})

export type AnalysisResult = z.infer<typeof analysisResultSchema>
export type SlideResult = z.infer<typeof slideResultSchema>
export type CaptionResult = z.infer<typeof captionResultSchema>
