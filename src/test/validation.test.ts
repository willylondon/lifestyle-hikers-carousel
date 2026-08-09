import { describe, expect, it } from 'vitest'
import { validatePhotoCount } from '@/lib/validation'

describe('photo validation', () => {
  it('requires at least five photos', () => {
    expect(validatePhotoCount(4)).toContain('at least 5')
  })

  it('allows a valid carousel count', () => {
    expect(validatePhotoCount(8)).toBeNull()
  })

  it('caps the upload at twenty photos', () => {
    expect(validatePhotoCount(21)).toContain('20 photos or fewer')
  })
})
