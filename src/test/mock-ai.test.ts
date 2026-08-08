import { describe, expect, it } from 'vitest'
import { MockAIService } from '@/lib/ai/mock-service'
import { demoProject } from '@/lib/demo/demo-project'

describe('mock ai service', () => {
  const service = new MockAIService()

  it('creates one analysis per photo', async () => {
    const analyses = await service.analyzeImages({
      projectTitle: demoProject.title,
      location: demoProject.location,
      notes: demoProject.notes,
      photos: demoProject.photos,
    })

    expect(analyses).toHaveLength(demoProject.photos.length)
    expect(analyses[0].recommendedRole).toBe('cover')
  })

  it('generates a coherent multi-slide carousel', async () => {
    const slides = await service.generateCarousel({
      projectTitle: demoProject.title,
      location: demoProject.location,
      notes: demoProject.notes,
      photos: demoProject.photos,
    })

    expect(slides).toHaveLength(demoProject.photos.length)
    expect(slides[0].slideType).toBe('hook')
    expect(slides.at(-1)?.slideType).toBe('cta')
  })
})
