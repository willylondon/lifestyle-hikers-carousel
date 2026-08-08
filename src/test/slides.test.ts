import { describe, expect, it } from 'vitest'
import { demoProject } from '@/lib/demo/demo-project'
import { reorderSlides, updateSlideField } from '@/lib/project-utils'

describe('slide editing helpers', () => {
  it('tracks manual edits on a slide field', () => {
    const slides = updateSlideField(demoProject.slides, 'slide-01', 'headline', 'Edited headline')
    expect(slides[0].headline).toBe('Edited headline')
    expect(slides[0].editedFields).toContain('headline')
  })

  it('reorders slides and rewrites order numbers', () => {
    const reordered = reorderSlides(demoProject.slides, 0, 2)
    expect(reordered[2].id).toBe('slide-01')
    expect(reordered.map((slide) => slide.order)).toEqual([0, 1, 2, 3, 4, 5])
  })
})
