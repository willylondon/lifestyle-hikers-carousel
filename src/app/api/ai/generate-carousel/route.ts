import { NextResponse } from 'next/server'
import { createAIService, getAIMode } from '@/lib/ai/service-factory'
import { generateCarouselSchema } from '@/lib/validation'

export async function POST(request: Request) {
  try {
    const payload = generateCarouselSchema.parse(await request.json())
    const service = createAIService()
    const analyses = await service.analyzeImages({
      projectTitle: payload.title,
      location: payload.location,
      notes: payload.notes,
      photos: payload.photos,
    })
    const slides = await service.generateCarousel(
      {
        projectTitle: payload.title,
        location: payload.location,
        notes: payload.notes,
        photos: payload.photos,
      },
      analyses
    )
    const caption = await service.generateCaption({
      title: payload.title,
      location: payload.location,
      notes: payload.notes,
      slides,
    })

    return NextResponse.json({ mode: getAIMode(), analyses, slides, caption })
  } catch {
    return NextResponse.json(
      { error: 'Carousel generation failed. Try fewer photos, shorter notes, or mock mode.' },
      { status: 400 }
    )
  }
}
