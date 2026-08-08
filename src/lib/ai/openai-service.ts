import type { PhotoAsset } from '@/types'
import type { AIService, CarouselGenerationInput, RegenerateSlideInput } from './types'
import { analysisResultSchema, captionResultSchema, slideResultSchema, type AnalysisResult, type CaptionResult, type SlideResult } from './schemas'

function jsonSchema(name: string, schema: object) {
  return {
    type: 'json_schema',
    name,
    strict: true,
    schema,
  }
}

async function callOpenAI<T>(payload: {
  prompt: string
  schemaName: string
  schema: object
  images?: PhotoAsset[]
}): Promise<T> {
  const apiKey = process.env.OPENAI_API_KEY
  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini'

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured.')
  }

  const input: Array<{ role: 'user'; content: Array<Record<string, unknown>> }> = [
    {
      role: 'user',
      content: [
        { type: 'input_text', text: payload.prompt },
        ...(payload.images ?? []).map((photo) => ({
          type: 'input_image',
          image_url: photo.dataUrl || photo.url,
          detail: 'low',
        })),
      ],
    },
  ]

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input,
      text: {
        format: jsonSchema(payload.schemaName, payload.schema),
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI request failed: ${response.status}`)
  }

  const json = (await response.json()) as {
    output_text?: string
  }

  if (!json.output_text) {
    throw new Error('OpenAI did not return structured output.')
  }

  return JSON.parse(json.output_text) as T
}

export class OpenAIService implements AIService {
  async analyzeImages(input: CarouselGenerationInput): Promise<AnalysisResult[]> {
    const prompt = `Analyze ${input.photos.length} hike photos for a Lifestyle Hikers Instagram carousel. Use only what is visible in the image plus the supplied hike notes. If something is uncertain, say so. Hike notes: ${input.notes}`
    const result = await callOpenAI<AnalysisResult[]>({
      prompt,
      schemaName: 'carousel_image_analysis',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: true,
        },
      },
      images: input.photos,
    })
    return result.map((entry) => analysisResultSchema.parse(entry))
  }

  async generateCarousel(input: CarouselGenerationInput, analyses?: AnalysisResult[]): Promise<SlideResult[]> {
    const prompt = `Create a ${input.photos.length}-slide editorial hiking carousel for Lifestyle Hikers. Use concise, intelligent, emotionally restrained writing. Avoid clichés and exaggeration. Hike notes: ${input.notes}. Analyses: ${JSON.stringify(analyses ?? [])}`
    const result = await callOpenAI<SlideResult[]>({
      prompt,
      schemaName: 'carousel_slides',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: true,
        },
      },
      images: input.photos,
    })
    return result.map((entry) => slideResultSchema.parse(entry))
  }

  async regenerateSlide(input: RegenerateSlideInput): Promise<SlideResult> {
    const prompt = `Regenerate a Lifestyle Hikers carousel slide. Replace only the ${input.target}. Keep the rest coherent with the current slide. Current slide: ${JSON.stringify(input.currentSlide)}. Notes: ${input.notes}`
    return slideResultSchema.parse(
      await callOpenAI<SlideResult>({
        prompt,
        schemaName: 'carousel_slide_regeneration',
        schema: {
          type: 'object',
          additionalProperties: true,
        },
        images: [input.photo],
      })
    )
  }

  async generateCaption(input: { title: string; location: string; notes: string; slides: SlideResult[] }): Promise<CaptionResult> {
    const prompt = `Create one Instagram caption for a Lifestyle Hikers carousel. Keep it concise and grounded. Title: ${input.title}. Location: ${input.location}. Notes: ${input.notes}. Slides: ${JSON.stringify(input.slides)}`
    return captionResultSchema.parse(
      await callOpenAI<CaptionResult>({
        prompt,
        schemaName: 'carousel_caption',
        schema: {
          type: 'object',
          additionalProperties: true,
        },
      })
    )
  }

  async generateAltText(input: { slide: SlideResult; photo: PhotoAsset }): Promise<string> {
    const prompt = `Write alt text for a Lifestyle Hikers carousel slide. Slide: ${JSON.stringify(input.slide)}.`
    const result = await callOpenAI<{ altText: string }>({
      prompt,
      schemaName: 'slide_alt_text',
      schema: {
        type: 'object',
        properties: {
          altText: { type: 'string' },
        },
        required: ['altText'],
        additionalProperties: false,
      },
      images: [input.photo],
    })
    return result.altText
  }
}
