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

    return NextResponse.json({ mode: getAIMode(), analyses })
  } catch {
    return NextResponse.json(
      { error: 'Image analysis failed. Check the photos, notes, and configured AI service.' },
      { status: 400 }
    )
  }
}
