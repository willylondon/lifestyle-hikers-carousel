import { NextResponse } from 'next/server'
import { createAIService, getAIMode } from '@/lib/ai/service-factory'
import { generateCarouselSchema } from '@/lib/validation'

export async function POST(request: Request) {
  try {
    const payload = generateCarouselSchema.parse(await request.json())
    const service = createAIService()
    const input = {
      projectTitle: payload.title,
      location: payload.location,
      notes: payload.notes,
      photos: payload.photos,
    }

    const analyses = payload.analyses ?? (await service.analyzeImages(input))
    const slides = await service.generateCarousel(input, analyses)
    const caption = await service.generateCaption({
      title: payload.title,
      location: payload.location,
      notes: payload.notes,
      slides,
    })

    return NextResponse.json({ mode: getAIMode(), analyses, slides, caption })
  } catch (cause) {
    console.error('Carousel generation failed', cause)
    return NextResponse.json(
      { error: cause instanceof Error ? cause.message : 'Carousel generation failed.' },
      { status: 400 }
    )
  }
}
