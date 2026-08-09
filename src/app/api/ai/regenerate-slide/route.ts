import { NextResponse } from 'next/server'
import { createAIService, getAIMode } from '@/lib/ai/service-factory'
import { regenerateSlideSchema } from '@/lib/validation'

export async function POST(request: Request) {
  try {
    const payload = regenerateSlideSchema.parse(await request.json())
    const service = createAIService()
    const slide = await service.regenerateSlide({
      projectTitle: payload.projectTitle,
      location: payload.location,
      notes: payload.notes,
      photo: payload.photo,
      currentSlide: payload.currentSlide,
      target: payload.target,
    })

    return NextResponse.json({ mode: getAIMode(), slide })
  } catch (cause) {
    console.error('Slide regeneration failed', cause)
    return NextResponse.json({ error: 'Slide regeneration failed.' }, { status: 400 })
  }
}
