import { NextResponse } from 'next/server'
import { createAIService, getAIMode } from '@/lib/ai/service-factory'
import { analyzeSchema } from '@/lib/validation'

export async function POST(request: Request) {
  try {
    const payload = analyzeSchema.parse(await request.json())
    const service = createAIService()
    const analyses = await service.analyzeImages({
      projectTitle: payload.title,
      location: payload.location,
      notes: payload.notes,
      photos: payload.photos,
    })

    return NextResponse.json({ mode: getAIMode(), analyses })
  } catch (cause) {
    console.error('Image analysis failed', cause)
    return NextResponse.json({ error: 'Image analysis failed.' }, { status: 400 })
  }
}
