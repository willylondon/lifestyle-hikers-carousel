import type { PhotoAsset } from '@/types'
import type { AIService, CarouselGenerationInput, RegenerateSlideInput } from './types'
import type { AnalysisResult, CaptionResult, SlideResult } from './schemas'

const roles = ['cover', 'middle', 'context', 'middle', 'context', 'cta'] as const
const placements = ['bottom-left', 'top-left', 'center', 'top-right', 'bottom-left', 'bottom-left'] as const
const slideTypes = ['hook', 'observation', 'nature', 'transition', 'reflection', 'cta'] as const

function inferSubject(photo: PhotoAsset, index: number) {
  const source = `${photo.originalName} ${photo.url}`.toLowerCase()
  if (source.includes('croc')) return 'crocodile at the edge of the wetland'
  if (source.includes('coast')) return 'coastline and open water'
  if (source.includes('wet')) return 'wetland textures and mangroves'
  if (source.includes('trail') || source.includes('heading')) return 'hikers moving deeper into the route'
  if (source.includes('reflect') || source.includes('beach')) return 'a reflective pause near the beach'
  if (source.includes('cave') || source.includes('sign')) return 'the signpost that anchors the route'
  return index === 0 ? 'the strongest establishing scene' : 'a trail moment'
}

function inferRole(index: number, total: number) {
  if (index === 0) return 'cover'
  if (index === total - 1) return 'cta'
  if (index === total - 2) return 'context'
  return roles[index % roles.length]
}

function orientation(photo: PhotoAsset) {
  if (photo.width === photo.height) return 'square'
  return photo.width > photo.height ? 'landscape' : 'portrait'
}

function safeRegions(index: number) {
  return [placements[index % placements.length], 'center', 'top-left'] as Array<AnalysisResult['likelyTextSafeRegions'][number]>
}

function makeAnalysis(photo: PhotoAsset, index: number, total: number, notes: string): AnalysisResult {
  const subject = inferSubject(photo, index)
  const role = inferRole(index, total)
  const orient = orientation(photo)
  return {
    primarySubject: subject,
    environment: role === 'cover' ? 'coastal Jamaica trail landscape' : 'trail environment with layered terrain',
    apparentActivity: index === 0 ? 'establishing the route' : index === total - 1 ? 'closing the story' : 'walking and observing',
    mood: index < 2 ? 'curious and alert' : index === total - 1 ? 'resolute' : 'reflective',
    foreground: subject,
    middleGround: 'the route and surrounding terrain',
    background: 'the wider landscape beyond the hikers',
    dominantColors: subject.includes('coast') ? ['sea green', 'sand', 'sky gray'] : ['deep green', 'charcoal', 'sand'],
    visualFocalPoint: subject,
    negativeSpace: safeRegions(index)[0],
    likelyTextSafeRegions: safeRegions(index),
    facesOrImportantPeople: 'People may be present, but the composition reads primarily as landscape storytelling.',
    environmentalFeatures: ['trail', 'vegetation', 'coastal terrain'],
    orientation: orient,
    storytellingUsefulness: role === 'cover' ? 'Strong hook image with immediate context.' : 'Useful supporting image that advances the hike narrative.',
    visualStrength: Math.max(0.68, 0.94 - index * 0.04),
    recommendedRole: role,
    accessibilityDescription: `Photo showing ${subject}.`,
    notesRelevance: notes.slice(0, 160),
    uncertaintyNotes: ['Mock analysis uses filename and upload order; replace with OpenAI for visual truth.'],
  }
}

function shortLines(notes: string) {
  return notes
    .split(/[.?!]/)
    .map((part) => part.trim())
    .filter(Boolean)
}

function buildHeadline(index: number, total: number) {
  if (index === 0) return 'Some routes only make sense once the road ends.'
  if (index === total - 1) return 'Walk the next story with Lifestyle Hikers.'
  if (index === total - 2) return 'The landscape kept changing, and so did the lesson.'
  return [
    'The trail introduced itself slowly.',
    'Distance made the details look simpler than they were.',
    'Then the route widened the story.',
    'What looked quiet kept proving otherwise.',
  ][index % 4]
}

function buildBody(index: number, total: number, analysis: AnalysisResult, notes: string) {
  const lines = shortLines(notes)
  if (index === 0) return 'The first frame should feel like an invitation into the route, not a summary of it.'
  if (index === total - 1) return 'Lifestyle Hikers builds stories by paying attention to the terrain, the people, and the transitions between them.'
  return lines[index - 1]?.slice(0, 130) || `This frame centers ${analysis.primarySubject} and keeps the story grounded in what was visible on the hike.`
}

function buildSlide(photo: PhotoAsset, index: number, total: number, analysis: AnalysisResult, notes: string): SlideResult {
  const type = slideTypes[Math.min(index, slideTypes.length - 1)]
  return {
    id: `slide-${index + 1}`,
    imageId: photo.id,
    slideType: index === total - 1 ? 'cta' : index === total - 2 ? 'reflection' : type,
    headline: buildHeadline(index, total),
    body: buildBody(index, total, analysis, notes),
    altText: `${analysis.accessibilityDescription} The slide text reads: ${buildHeadline(index, total)}`,
    textAlignment: index === 2 ? 'center' : 'left',
    textPlacement: placements[index % placements.length],
    overlayStrength: index === total - 1 ? 48 : index === 0 ? 44 : 34,
    textShadow: true,
    cropPosition: index === 3 ? 'top' : 'center',
    cta: index === total - 1 ? 'Plan the next trail with @lifestylehikers' : undefined,
    confidence: Math.max(0.72, 0.93 - index * 0.03),
    reasoningSummary: `Placed text ${placements[index % placements.length]} because mock analysis marked that region as the safest negative space.`,
  }
}

export class MockAIService implements AIService {
  async analyzeImages(input: CarouselGenerationInput) {
    return input.photos.map((photo, index) => makeAnalysis(photo, index, input.photos.length, input.notes))
  }

  async generateCarousel(input: CarouselGenerationInput, analyses?: AnalysisResult[]) {
    const resolvedAnalyses = analyses ?? (await this.analyzeImages(input))
    return input.photos.map((photo, index) => buildSlide(photo, index, input.photos.length, resolvedAnalyses[index], input.notes))
  }

  async regenerateSlide(input: RegenerateSlideInput) {
    const analysis = makeAnalysis(input.photo, input.currentSlide.order, 6, input.notes)
    const regenerated = buildSlide(input.photo, input.currentSlide.order, 6, analysis, input.notes)

    if (input.target === 'headline') {
      return {
        ...regenerated,
        body: input.currentSlide.body,
        textAlignment: input.currentSlide.alignment,
        textPlacement: input.currentSlide.placement,
        overlayStrength: input.currentSlide.overlay,
        textShadow: input.currentSlide.shadow,
        cropPosition: input.currentSlide.crop,
      }
    }

    if (input.target === 'body') {
      return {
        ...regenerated,
        headline: input.currentSlide.headline,
        textAlignment: input.currentSlide.alignment,
        textPlacement: input.currentSlide.placement,
        overlayStrength: input.currentSlide.overlay,
        textShadow: input.currentSlide.shadow,
        cropPosition: input.currentSlide.crop,
      }
    }

    return regenerated
  }

  async generateCaption(input: { title: string; location: string; notes: string; slides: SlideResult[] }): Promise<CaptionResult> {
    return {
      caption: `${input.slides[0]?.headline}\n\n${input.notes.split(/[.?!]/)[0]?.trim() || 'This route moved through multiple terrains and asked for more attention than speed.'}\n\nLifestyle Hikers turns routes into stories worth saving. Plan the next trail with @lifestylehikers.`,
      hashtags: ['#LifestyleHikers', '#JamaicaHiking', '#TrailStory'],
      keywords: [input.location, input.title, 'editorial carousel'],
    }
  }

  async generateAltText(input: { slide: SlideResult; photo: PhotoAsset }) {
    return `Photo of ${inferSubject(input.photo, input.slide.id.length)} with editorial slide text: ${input.slide.headline}`
  }
}
