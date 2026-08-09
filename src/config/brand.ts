import type { BrandConfig } from '@/types'

export const brandConfig: BrandConfig = {
  canvasWidth: 1080,
  canvasHeight: 1350,
  safeMargin: 70,
  fontFamily: 'var(--font-sans)',
  headlineFontFamily: 'var(--font-sans)',
  bodyFontFamily: 'var(--font-sans)',
  headlineSize: 74,
  bodySize: 29,
  metaSize: 20,
  textColor: '#f7f5f0',
  supportingTextColor: '#f0ede6',
  uiBackground: '#101311',
  brandName: 'LIFESTYLE HIKERS',
  tagline: 'One foot in front the other.',
  handle: '@lifestylehikers',
}

export const editorialStyle = {
  accentColor: '#d6a23d',
  brandTracking: 6,
  headlineLineHeight: 0.98,
  bodyLineHeight: 1.34,
  textColumnWidth: 510,
  ruleWidth: 168,
  ruleThickness: 2,
  ruleGapTop: 38,
  ruleGapBottom: 34,
  brandTop: 64,
} as const

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
