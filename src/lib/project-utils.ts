import type { PhotoAsset, Project, Slide } from '@/types'

export function makeId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

export function toProjectStatus(slides: Slide[], hasNotes: boolean) {
  if (slides.length > 0) return 'generated' as const
  if (hasNotes) return 'ready' as const
  return 'draft' as const
}

export function updateTimestamp(project: Project): Project {
  return { ...project, updatedAt: new Date().toISOString() }
}

export function photoMap(photos: PhotoAsset[]) {
  return new Map(photos.map((photo) => [photo.id, photo]))
}

export function reorderSlides(slides: Slide[], fromIndex: number, toIndex: number) {
  const next = [...slides]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  return next.map((slide, index) => ({ ...slide, order: index }))
}

export function updateSlideField<T extends keyof Slide>(slides: Slide[], slideId: string, key: T, value: Slide[T]) {
  return slides.map((slide) =>
    slide.id === slideId
      ? {
          ...slide,
          [key]: value,
          editedFields: Array.from(new Set([...slide.editedFields, String(key)])),
        }
      : slide
  )
}
