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
    const prompt = `Analyze ${input.photos.length} event/hike photo${input.photos.length === 1 ? '' : 's'} for a Lifestyle Hikers Instagram story carousel. Lifestyle Hikers is not just documenting scenery; the content should reveal community, Jamaican culture, outdoor discovery, shared experience, and why people return. Identify the actual focal subject, faces/people that must stay unobstructed, useful negative space for typography, and the storytelling role each image can play in a sequence. Prefer left or right text-safe zones rather than centered text. Use only what is visible plus supplied project notes. If uncertain, put it in uncertaintyNotes. Return exactly one analysis object per photo in the same order. Project title: ${input.projectTitle}. Location: ${input.location}. Notes: ${input.notes}`
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
    const isEmancipation = /emancipation/i.test(`${input.projectTitle} ${input.notes}`)
    const emancipationContext = isEmancipation
      ? `This project is about Jamaican Emancipation Day. Build the story around what freedom means historically and communally, then connect that meaning to people choosing to gather, eat, play, walk, explore and spend time outdoors together. You may accurately teach this concise historical point once: Jamaica marks Emancipation Day on August 1, commemorating the end of slavery in 1834; formerly enslaved people were then forced into an apprenticeship system until full freedom in 1838. Do not turn the carousel into a history lecture. Use the fact as context, then return to the people and the present-day gathering.`
      : `If the project centers on a holiday, cultural event or historical occasion, include one useful, accurate piece of context and connect it naturally to the present-day community shown in the photographs. Do not invent facts.`

    const prompt = `Create a ${input.photos.length}-slide Lifestyle Hikers Instagram carousel designed for saves, shares, comments, profile visits and follows without using clickbait. This must read as ONE STORY, not ${input.photos.length} unrelated photo captions.

BRAND PURPOSE:
Lifestyle Hikers helps people experience Jamaica through movement, nature, culture and community. A reader should finish the carousel having learned something, felt the warmth of the group, and understood why following @lifestylehikers gives them access to a side of Jamaica they may not see from the road.

STORY ARC:
1. HOOK: open with a strong idea, tension, question or observation that makes the viewer swipe. Do not simply announce the event.
2. CONTEXT: give the reader one useful cultural, historical or place-based insight relevant to the occasion.
3. PEOPLE: show how the Lifestyle Hikers community came together and what the gathering felt like.
4. EXPERIENCE: use food, games, walking, river, trail, conversation or other visible activities as evidence of community rather than listing them mechanically.
5. MEANING: connect the visible experience to a larger idea such as freedom, belonging, heritage, discovery or shared memory, without becoming sentimental.
6. DISCOVERY: give the reader a reason to value outdoor exploration in Jamaica and what Lifestyle Hikers reveals through these experiences.
7. CTA: end with an invitation that feels earned. Encourage a follow, comment, save, share or future hike. The CTA must tell the reader what they will gain by following Lifestyle Hikers.
For projects with more than seven images, extend the middle of the story with distinct moments; do not repeat the same message.

${emancipationContext}

WRITING RULES:
- Headlines: 4-10 words, strong enough to stand alone, human and memorable.
- Body copy: normally 12-35 words, maximum 2 short sentences.
- Do not describe the obvious photo unless the detail advances the story.
- Do not use generic phrases such as good vibes, making memories, nature and community combined, adventure awaits, unforgettable moments, smiles abound, or come join the fun.
- Do not make every headline a title-case event description.
- Vary rhythm across slides: hook, fact, observation, reflection, invitation.
- Use Jamaican context naturally, never as tourism copy.
- Do not invent names, identities, history, locations or activities unsupported by notes/analysis.
- Every slide should add NEW information or emotional movement.
- The final carousel should make someone think: I learned something; I want to experience this; I should follow Lifestyle Hikers.

VISUAL ART DIRECTION:
Full-bleed photography; small widely spaced LIFESTYLE HIKERS branding at top-left; large bold white headline in 2-5 short lines; thin white divider; restrained supporting copy; warm-gold @lifestylehikers emphasis on CTA. Photograph remains dominant. Place typography only in genuine negative space and never across faces, bodies, hands or the main subject. Prefer left alignment when safe; use right only when required; never center typography.

IMAGE RULES:
Each slide must use imageId exactly from this allowed list: ${JSON.stringify(validImageIds)}. Use every supplied photo once unless sequencing genuinely requires a repeated hero image. Never invent an imageId. Use null for cta except the final CTA or a slide that genuinely needs one.

PROJECT: ${input.projectTitle}
LOCATION: ${input.location}
NOTES: ${input.notes}
PHOTO METADATA: ${JSON.stringify(input.photos.map(({ id, originalName, width, height }) => ({ id, originalName, width, height })))}
PHOTO ANALYSES: ${JSON.stringify(analyses ?? [])}`

    const result = await callOpenAI<{ slides: SlideResult[] }>({
      prompt,
      schemaName: 'carousel_slides',
      schema: { type: 'object', properties: { slides: { type: 'array', items: slideItemSchema(validImageIds) } }, required: ['slides'], additionalProperties: false },
    })
    return result.slides.map((entry) => slideResultSchema.parse({ ...entry, cta: entry.cta ?? undefined }))
  }

  async regenerateSlide(input: RegenerateSlideInput): Promise<SlideResult> {
    const prompt = `Regenerate a single Lifestyle Hikers editorial slide. Preserve the exact imageId ${input.photo.id}. Replace only the ${input.target}. The replacement must preserve the larger carousel narrative rather than becoming a standalone photo description. Keep the voice specific, concise, educational where relevant, and grounded in the visible image and project notes. Headlines should normally be 4-10 words. Body copy should normally be 12-35 words. Avoid generic inspiration and event-summary language. Use left/right placement based on negative space and no centered typography. Use null for cta when there is no CTA. Current slide: ${JSON.stringify(input.currentSlide)}. Notes: ${input.notes}`
    const result = await callOpenAI<SlideResult & { cta: string | null }>({ prompt, schemaName: 'carousel_slide_regeneration', schema: slideItemSchema([input.photo.id]), images: [input.photo] })
    return slideResultSchema.parse({ ...result, cta: result.cta ?? undefined })
  }

  async generateCaption(input: { title: string; location: string; notes: string; slides: SlideResult[] }): Promise<CaptionResult> {
    const isEmancipation = /emancipation/i.test(`${input.title} ${input.notes}`)
    const eventInstruction = isEmancipation
      ? `This is an Emancipation Day post. Frame the gathering as a present-day expression of freedom, community and Jamaican identity. If useful, briefly note that August 1 commemorates emancipation in 1834, with full freedom following the apprenticeship period in 1838.`
      : ''
    const prompt = `Write the Instagram caption for a Lifestyle Hikers carousel. The goal is meaningful engagement and follows, not a generic event recap. Open with one strong sentence that adds to the carousel rather than repeating slide 1. In 2-4 short paragraphs, connect the occasion, the people, the outdoor experience and what Lifestyle Hikers stands for. Include one natural question that invites comments. End with a clear reason to follow @lifestylehikers for future hikes, Jamaican places, culture and community experiences. Keep it grounded and conversational. Avoid generic motivational language, inflated claims and hashtag stuffing. Provide 5-8 relevant hashtags and useful search keywords. ${eventInstruction} Title: ${input.title}. Location: ${input.location}. Notes: ${input.notes}. Slides: ${JSON.stringify(input.slides)}`
    return captionResultSchema.parse(await callOpenAI<CaptionResult>({ prompt, schemaName: 'carousel_caption', schema: captionSchema }))
  }

  async generateAltText(input: { slide: SlideResult; photo: PhotoAsset }): Promise<string> {
    const prompt = `Write factual alt text for a Lifestyle Hikers carousel slide. Describe the visible scene without guessing identity or unsupported context. Slide: ${JSON.stringify(input.slide)}.`
    const result = await callOpenAI<{ altText: string }>({ prompt, schemaName: 'slide_alt_text', schema: { type: 'object', properties: { altText: { type: 'string' } }, required: ['altText'], additionalProperties: false }, images: [input.photo] })
    return result.altText
  }
}
