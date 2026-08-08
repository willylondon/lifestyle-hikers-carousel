import type { BrandConfig } from '@/types'

export const brandConfig: BrandConfig = {
  canvasWidth: 1080,
  canvasHeight: 1350,
  safeMargin: 82,
  fontFamily: 'var(--font-sans)',
  headlineFontFamily: 'var(--font-sans)',
  bodyFontFamily: 'var(--font-sans)',
  headlineSize: 54,
  bodySize: 31,
  metaSize: 20,
  textColor: '#f6f3ed',
  supportingTextColor: '#d9d2c6',
  uiBackground: '#101311',
  brandName: 'Lifestyle Hikers',
  tagline: 'One foot in front the other.',
  handle: '@lifestylehikers',
}

export const slideTypeLabels = {
  hook: 'Hook',
  observation: 'Observation',
  lesson: 'Lesson',
  nature: 'Nature',
  culture: 'Culture',
  history: 'History',
  challenge: 'Challenge',
  transition: 'Transition',
  reflection: 'Reflection',
  cta: 'CTA',
} as const
