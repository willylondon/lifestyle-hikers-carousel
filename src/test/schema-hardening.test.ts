import { describe, expect, it } from 'vitest'
import { analyzePhotoSchema, captionSchema, MAX_DATA_URL_LENGTH, photoInputSchema } from '@/lib/validation'

const basePhoto = {
  id: 'photo-1',
  originalName: 'trail.jpg',
  url: 'trail.jpg',
  width: 1080,
  height: 1350,
  mimeType: 'image/jpeg' as const,
}

const baseSlide = {
  id: 'slide-1',
  imageId: 'photo-1',
  slideType: 'hook' as const,
  headline: 'A strong opening',
  body: 'A concise body.',
  altText: 'People outdoors on a trail.',
  textAlignment: 'left' as const,
  textPlacement: 'bottom-left' as const,
  overlayStrength: 40,
  textShadow: true,
  cropPosition: 'center' as const,
  confidence: 0.9,
  reasoningSummary: 'Uses clear negative space.',
}

describe('request schema hardening', () => {
  it.each([
    'http://169.254.169.254/latest/meta-data/',
    'file:///etc/passwd',
    'gopher://127.0.0.1/',
    'ftp://example.com/file',
  ])('rejects unsafe URL %s', (url) => {
    expect(photoInputSchema.safeParse({ ...basePhoto, url }).success).toBe(false)
  })

  it('accepts a plain filename and HTTPS URL', () => {
    expect(photoInputSchema.safeParse(basePhoto).success).toBe(true)
    expect(photoInputSchema.safeParse({ ...basePhoto, url: 'https://example.com/trail.jpg' }).success).toBe(true)
  })

  it('rejects non-image data URLs', () => {
    expect(photoInputSchema.safeParse({ ...basePhoto, dataUrl: 'data:text/plain;base64,AAAA' }).success).toBe(false)
  })

  it('rejects oversized data URLs', () => {
    const oversized = `data:image/jpeg;base64,${'A'.repeat(MAX_DATA_URL_LENGTH)}`
    expect(photoInputSchema.safeParse({ ...basePhoto, dataUrl: oversized }).success).toBe(false)
  })

  it('requires dataUrl on the single-photo analysis route', () => {
    const parsed = analyzePhotoSchema.safeParse({
      title: 'Temple Hall Story',
      location: 'Temple Hall, St. Andrew',
      notes: 'Enough grounded excursion notes for analysis.',
      photo: basePhoto,
    })
    expect(parsed.success).toBe(false)
  })

  it('rejects arbitrary caption slide objects', () => {
    expect(captionSchema.safeParse({
      title: 'Temple Hall Story',
      location: 'Temple Hall',
      notes: 'Enough grounded excursion notes for caption generation.',
      slides: [{ anything: 'goes' }],
    }).success).toBe(false)
  })

  it('accepts a properly shaped caption payload', () => {
    expect(captionSchema.safeParse({
      title: 'Temple Hall Story',
      location: 'Temple Hall',
      notes: 'Enough grounded excursion notes for caption generation.',
      slides: [baseSlide],
    }).success).toBe(true)
  })
})
