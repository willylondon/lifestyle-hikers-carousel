import type { PhotoAsset } from '@/types'
import type { AIService, CarouselGenerationInput, RegenerateSlideInput } from './types'
import { analysisResultSchema, captionResultSchema, slideResultSchema, type AnalysisResult, type CaptionResult, type SlideResult } from './schemas'

function jsonSchema(name: string, schema: object) {
  return { type: 'json_schema', name, strict: true, schema }
}

function extractOutputText(json: Record<string, unknown>) {
  if (typeof json.output_text === 'string' && json.output_text.trim()) return json.output_text
  const output = Array.isArray(json.output) ? json.output : []
  for (const item of output) {
    if (!item || typeof item !== 'object') continue
    const content = Array.isArray((item as { content?: unknown }).content) ? (item as { content: unknown[] }).content : []
    for (const part of content) {
      if (!part || typeof part !== 'object') continue
      const record = part as { type?: unknown; text?: unknown }
      if ((record.type === 'output_text' || record.type === 'text') && typeof record.text === 'string' && record.text.trim()) return record.text
    }
  }
  return null
}

async function callOpenAI<T>(payload: { prompt: string; schemaName: string; schema: object; images?: PhotoAsset[] }): Promise<T> {
  const apiKey = process.env.OPENAI_API_KEY
  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini'
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured.')

  const input: Array<{ role: 'user'; content: Array<Record<string, unknown>> }> = [{
    role: 'user',
    content: [
      { type: 'input_text', text: payload.prompt },
      ...(payload.images ?? []).map((photo) => ({ type: 'input_image', image_url: photo.dataUrl || photo.url, detail: 'low' })),
    ],
  }]

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, input, text: { format: jsonSchema(payload.schemaName, payload.schema) } }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`OpenAI request failed: ${response.status}${body ? ` - ${body.slice(0, 700)}` : ''}`)
  }

  const json = (await response.json()) as Record<string, unknown>
  const outputText = extractOutputText(json)
  if (!outputText) throw new Error('OpenAI returned no usable text output.')

  try {
    return JSON.parse(outputText) as T
  } catch {
    throw new Error('OpenAI returned an invalid structured response.')
  }
}

const placementEnum = ['top-left','top-center','top-right','center-left','center','center-right','bottom-left','bottom-center','bottom-right']

const analysisItemSchema = {
  type: 'object',
  properties: {
    primarySubject: { type: 'string' },
    environment: { type: 'string' },
    apparentActivity: { type: 'string' },
    mood: { type: 'string' },
    foreground: { type: 'string' },
    middleGround: { type: 'string' },
    background: { type: 'string' },
    dominantColors: { type: 'array', items: { type: 'string' } },
    visualFocalPoint: { type: 'string' },
    negativeSpace: { type: 'string' },
    likelyTextSafeRegions: { type: 'array', items: { type: 'string', enum: placementEnum } },
    facesOrImportantPeople: { type: 'string' },
    environmentalFeatures: { type: 'array', items: { type: 'string' } },
    orientation: { type: 'string', enum: ['portrait', 'landscape', 'square'] },
    storytellingUsefulness: { type: 'string' },
    visualStrength: { type: 'number', minimum: 0, maximum: 1 },
    recommendedRole: { type: 'string', enum: ['cover', 'middle', 'context', 'cta'] },
    accessibilityDescription: { type: 'string' },
    notesRelevance: { type: 'string' },
    uncertaintyNotes: { type: 'array', items: { type: 'string' } },
  },
  required: ['primarySubject','environment','apparentActivity','mood','foreground','middleGround','background','dominantColors','visualFocalPoint','negativeSpace','likelyTextSafeRegions','facesOrImportantPeople','environmentalFeatures','orientation','storytellingUsefulness','visualStrength','recommendedRole','accessibilityDescription','notesRelevance','uncertaintyNotes'],
  additionalProperties: false,
} as const

function slideItemSchema(imageIds: string[]) {
  return {
    type: 'object',
    properties: {
      id: { type: 'string' },
      imageId: { type: 'string', enum: imageIds },
      slideType: { type: 'string', enum: ['hook','observation','lesson','nature','culture','history','challenge','transition','reflection','cta'] },
      headline: { type: 'string' },
      body: { type: 'string' },
      altText: { type: 'string' },
      textAlignment: { type: 'string', enum: ['left', 'right'] },
      textPlacement: { type: 'string', enum: placementEnum },
      overlayStrength: { type: 'number', minimum: 34, maximum: 65 },
      textShadow: { type: 'boolean' },
      cropPosition: { type: 'string', enum: ['center', 'top', 'bottom', 'left', 'right'] },
      cta: { type: ['string', 'null'] },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
      reasoningSummary: { type: 'string' },
    },
    required: ['id','imageId','slideType','headline','body','altText','textAlignment','textPlacement','overlayStrength','textShadow','cropPosition','cta','confidence','reasoningSummary'],
    additionalProperties: false,
  }
}

const captionSchema = {
  type: 'object',
  properties: {
    caption: { type: 'string' },
    hashtags: { type: 'array', items: { type: 'string' } },
    keywords: { type: 'array', items: { type: 'string' } },
  },
  required: ['caption', 'hashtags', 'keywords'],
  additionalProperties: false,
} as const

export class OpenAIService implements AIService {
  async analyzeImages(input: CarouselGenerationInput): Promise<AnalysisResult[]> {
    const prompt = `Analyze ${input.photos.length} hike photo${input.photos.length === 1 ? '' : 's'} for a premium Lifestyle Hikers editorial carousel. Identify the actual focal subject, faces/people that must stay unobstructed, and useful negative space for typography. Prefer left or right text-safe zones rather than centered text. Use only what is visible plus supplied hike notes. If uncertain, put it in uncertaintyNotes. Return exactly one analysis object per photo in the same order. Hike notes: ${input.notes}`
    const result = await callOpenAI<{ analyses: AnalysisResult[] }>({
      prompt,
      schemaName: 'carousel_image_analysis',
      schema: { type: 'object', properties: { analyses: { type: 'array', items: analysisItemSchema } }, required: ['analyses'], additionalProperties: false },
      images: input.photos,
    })
    return result.analyses.map((entry) => analysisResultSchema.parse(entry))
  }

  async generateCarousel(input: CarouselGenerationInput, analyses?: AnalysisResult[]): Promise<SlideResult[]> {
    const validImageIds = input.photos.map((photo) => photo.id)
    const prompt = `Art-direct a ${input.photos.length}-slide Lifestyle Hikers Instagram carousel in a premium outdoor editorial style. The visual reference is a full-bleed photograph with small widely spaced LIFESTYLE HIKERS branding at top-left; a large bold white headline arranged in 2-5 short lines; a thin white divider rule; restrained supporting copy; and, on CTA slides only, a bold CTA plus @lifestylehikers in warm gold. The photograph must remain dominant. Place typography only in genuine negative space and never across faces, bodies, hands, or the main focal subject. Prefer left-aligned editorial composition when safe; use right alignment only when the image clearly requires it; avoid centered typography. Keep headlines concise, literary, specific to the visible moment, and generally 6-14 words. Keep body copy to 1-3 short sentences, grounded in the photo and hike notes. Avoid generic motivation, clichés, invented history, invented locations, or claims not supported by the image/notes. Each slide must use imageId exactly from this allowed list: ${JSON.stringify(validImageIds)}. Use every supplied photo once unless sequencing requires a repeated hero image; never invent an imageId. Use null for cta except the final CTA or a slide that genuinely needs one. Hike notes: ${input.notes}. Photo metadata: ${JSON.stringify(input.photos.map(({ id, originalName, width, height }) => ({ id, originalName, width, height })))}. Analyses: ${JSON.stringify(analyses ?? [])}`
    const result = await callOpenAI<{ slides: SlideResult[] }>({
      prompt,
      schemaName: 'carousel_slides',
      schema: { type: 'object', properties: { slides: { type: 'array', items: slideItemSchema(validImageIds) } }, required: ['slides'], additionalProperties: false },
    })
    return result.slides.map((entry) => slideResultSchema.parse({ ...entry, cta: entry.cta ?? undefined }))
  }

  async regenerateSlide(input: RegenerateSlideInput): Promise<SlideResult> {
    const prompt = `Regenerate a single Lifestyle Hikers editorial slide. Preserve the exact imageId ${input.photo.id}. Replace only the ${input.target}. Keep the design voice premium, restrained, image-specific, and concise. Use large editorial headline language, supporting copy that stays grounded in the visible photo and notes, left/right placement based on negative space, and no centered typography. Use null for cta when there is no CTA. Current slide: ${JSON.stringify(input.currentSlide)}. Notes: ${input.notes}`
    const result = await callOpenAI<SlideResult & { cta: string | null }>({ prompt, schemaName: 'carousel_slide_regeneration', schema: slideItemSchema([input.photo.id]), images: [input.photo] })
    return slideResultSchema.parse({ ...result, cta: result.cta ?? undefined })
  }

  async generateCaption(input: { title: string; location: string; notes: string; slides: SlideResult[] }): Promise<CaptionResult> {
    const prompt = `Create one Instagram caption for a Lifestyle Hikers editorial carousel. Keep it concise, grounded, specific, and free of generic motivational language. Title: ${input.title}. Location: ${input.location}. Notes: ${input.notes}. Slides: ${JSON.stringify(input.slides)}`
    return captionResultSchema.parse(await callOpenAI<CaptionResult>({ prompt, schemaName: 'carousel_caption', schema: captionSchema }))
  }

  async generateAltText(input: { slide: SlideResult; photo: PhotoAsset }): Promise<string> {
    const prompt = `Write factual alt text for a Lifestyle Hikers carousel slide. Describe the visible scene without guessing identity or unsupported context. Slide: ${JSON.stringify(input.slide)}.`
    const result = await callOpenAI<{ altText: string }>({ prompt, schemaName: 'slide_alt_text', schema: { type: 'object', properties: { altText: { type: 'string' } }, required: ['altText'], additionalProperties: false }, images: [input.photo] })
    return result.altText
  }
}
