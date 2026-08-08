import type { PhotoAsset, Slide } from '@/types'
import type { AnalysisResult, CaptionResult, SlideResult } from './schemas'

export interface CarouselGenerationInput {
  projectTitle: string
  location: string
  notes: string
  photos: PhotoAsset[]
}

export interface RegenerateSlideInput {
  projectTitle: string
  location: string
  notes: string
  photo: PhotoAsset
  currentSlide: Slide
  target: 'slide' | 'headline' | 'body'
}

export interface AIService {
  analyzeImages(input: CarouselGenerationInput): Promise<AnalysisResult[]>
  generateCarousel(input: CarouselGenerationInput, analyses?: AnalysisResult[]): Promise<SlideResult[]>
  regenerateSlide(input: RegenerateSlideInput): Promise<SlideResult>
  generateCaption(input: { title: string; location: string; notes: string; slides: SlideResult[] }): Promise<CaptionResult>
  generateAltText(input: { slide: SlideResult; photo: PhotoAsset }): Promise<string>
}
