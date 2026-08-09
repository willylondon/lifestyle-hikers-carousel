import type { PhotoAsset } from '@/types'
import type { AIService, CarouselGenerationInput, RegenerateSlideInput } from './types'
import { analysisResultSchema, captionResultSchema, slideResultSchema, type AnalysisResult, type CaptionResult, type SlideResult } from './schemas'

function jsonSchema(name: string, schema: object) {
  return { type: 'json_schema', name, strict: false, schema }
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
      if ((record.type === 'output_text' || record.type === 'text') && typeof record.text === 'string' && record.text.trim()) {
        return record.text
      }
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
    throw new Error(`OpenAI request failed: ${response.status}${body ? ` - ${body.slice(0, 500)}` : ''}`)
  }

  const json = (await response.json()) as Record<string, unknown>
  const outputText = extractOutputText(json)
  if (!outputText) {
    const status = typeof json.status === 'string' ? ` Status: ${json.status}.` : ''
    const incomplete = json.incomplete_details ? ` Details: ${JSON.stringify(json.incomplete_details).slice(0, 300)}.` : ''
    console.error('OpenAI response contained no output text', { status: json.status, incomplete_details: json.incomplete_details, output: json.output })
    throw new Error(`OpenAI returned no usable text output.${status}${incomplete}`)
  }

  try {
    return JSON.parse(outputText) as T
  } catch {
    console.error('OpenAI returned non-JSON output', outputText.slice(0, 500))
    throw new Error('OpenAI returned an invalid structured response.')
  }
}

const looseObjectSchema = { type: 'object', additionalProperties: true } as const

export class OpenAIService implements AIService {
  async analyzeImages(input: CarouselGenerationInput): Promise<AnalysisResult[]> {
    const prompt = `Analyze ${input.photos.length} hike photo${input.photos.length === 1 ? '' : 's'} for a Lifestyle Hikers Instagram carousel. Use only what is visible in the image plus the supplied hike notes. If something is uncertain, say so. Return a JSON object with an "analyses" array containing one analysis object per supplied photo, in the same order. Hike notes: ${input.notes}`
    const result = await callOpenAI<{ analyses: AnalysisResult[] }>({
      prompt, schemaName: 'carousel_image_analysis',
      schema: { type: 'object', properties: { analyses: { type: 'array', items: looseObjectSchema } }, required: ['analyses'], additionalProperties: false },
      images: input.photos,
    })
    return result.analyses.map((entry) => analysisResultSchema.parse(entry))
  }

  async generateCarousel(input: CarouselGenerationInput, analyses?: AnalysisResult[]): Promise<SlideResult[]> {
    const prompt = `Create a ${input.photos.length}-slide editorial hiking carousel for Lifestyle Hikers. Use concise, intelligent, emotionally restrained writing. Avoid clichés and exaggeration. Preserve the imageId values from the supplied photo metadata. Return a JSON object with a "slides" array. Hike notes: ${input.notes}. Photo metadata: ${JSON.stringify(input.photos.map(({ id, originalName, width, height }) => ({ id, originalName, width, height })))}. Analyses: ${JSON.stringify(analyses ?? [])}`
    const result = await callOpenAI<{ slides: SlideResult[] }>({
      prompt, schemaName: 'carousel_slides',
      schema: { type: 'object', properties: { slides: { type: 'array', items: looseObjectSchema } }, required: ['slides'], additionalProperties: false },
    })
    return result.slides.map((entry) => slideResultSchema.parse(entry))
  }

  async regenerateSlide(input: RegenerateSlideInput): Promise<SlideResult> {
    const prompt = `Regenerate a Lifestyle Hikers carousel slide. Replace only the ${input.target}. Keep the rest coherent with the current slide. Current slide: ${JSON.stringify(input.currentSlide)}. Notes: ${input.notes}`
    return slideResultSchema.parse(await callOpenAI<SlideResult>({ prompt, schemaName: 'carousel_slide_regeneration', schema: looseObjectSchema, images: [input.photo] }))
  }

  async generateCaption(input: { title: string; location: string; notes: string; slides: SlideResult[] }): Promise<CaptionResult> {
    const prompt = `Create one Instagram caption for a Lifestyle Hikers carousel. Keep it concise and grounded. Title: ${input.title}. Location: ${input.location}. Notes: ${input.notes}. Slides: ${JSON.stringify(input.slides)}`
    return captionResultSchema.parse(await callOpenAI<CaptionResult>({ prompt, schemaName: 'carousel_caption', schema: looseObjectSchema }))
  }

  async generateAltText(input: { slide: SlideResult; photo: PhotoAsset }): Promise<string> {
    const prompt = `Write alt text for a Lifestyle Hikers carousel slide. Slide: ${JSON.stringify(input.slide)}.`
    const result = await callOpenAI<{ altText: string }>({
      prompt, schemaName: 'slide_alt_text',
      schema: { type: 'object', properties: { altText: { type: 'string' } }, required: ['altText'], additionalProperties: false }, images: [input.photo],
    })
    return result.altText
  }
}
