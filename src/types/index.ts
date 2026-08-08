export type ProjectStatus =
  | 'draft'
  | 'ready'
  | 'analyzing'
  | 'generated'
  | 'approved'
  | 'exported'

export type SlideType =
  | 'hook'
  | 'observation'
  | 'lesson'
  | 'nature'
  | 'culture'
  | 'history'
  | 'challenge'
  | 'transition'
  | 'reflection'
  | 'cta'

export type TextAlignment = 'left' | 'center' | 'right'
export type TextPlacement =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'

export type CropPreset = 'center' | 'top' | 'bottom' | 'left' | 'right'

export interface PhotoAnalysis {
  primarySubject: string
  environment: string
  apparentActivity: string
  mood: string
  foreground: string
  middleGround: string
  background: string
  dominantColors: string[]
  visualFocalPoint: string
  negativeSpace: string
  likelyTextSafeRegions: TextPlacement[]
  facesOrImportantPeople: string
  environmentalFeatures: string[]
  orientation: 'portrait' | 'landscape' | 'square'
  storytellingUsefulness: string
  visualStrength: number
  recommendedRole: 'cover' | 'middle' | 'context' | 'cta'
  accessibilityDescription: string
  notesRelevance: string
  uncertaintyNotes?: string[]
}

export interface PhotoAsset {
  id: string
  originalName: string
  url: string
  dataUrl?: string
  thumbnailDataUrl?: string
  width: number
  height: number
  mimeType: string
  analysis?: PhotoAnalysis
}

export interface Slide {
  id: string
  order: number
  photoId: string
  type: SlideType
  headline: string
  body: string
  altText: string
  alignment: TextAlignment
  placement: TextPlacement
  overlay: number
  shadow: boolean
  crop: CropPreset
  cta?: string
  confidence: number
  reasoningSummary: string
  editedFields: string[]
}

export interface Project {
  id: string
  title: string
  location: string
  notes: string
  createdAt: string
  updatedAt: string
  status: ProjectStatus
  photos: PhotoAsset[]
  slides: Slide[]
  caption: string
  hashtags: string[]
  keywords: string[]
  coverPhotoId?: string
  approvedAt?: string
  analytics?: {
    instagramPostId?: string
    publishedAt?: string
    reach?: number
    impressions?: number
    likes?: number
    comments?: number
    shares?: number
    saves?: number
    profileVisits?: number
  }
}

export interface BrandConfig {
  canvasWidth: number
  canvasHeight: number
  safeMargin: number
  fontFamily: string
  headlineFontFamily: string
  bodyFontFamily: string
  headlineSize: number
  bodySize: number
  metaSize: number
  textColor: string
  supportingTextColor: string
  uiBackground: string
  brandName: string
  tagline: string
  handle: string
}
