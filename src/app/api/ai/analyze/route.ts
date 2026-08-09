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

    if (analyses.length !== payload.photos.length) {
      console.error('Image analysis count mismatch', { requested: payload.photos.length, received: analyses.length })
      return NextResponse.json({ error: 'Image analysis failed.' }, { status: 502 })
    }

    return NextResponse.json({
      mode: getAIMode(),
      analyses: analyses.map((analysis, index) => ({ photoId: payload.photos[index].id, analysis })),
    })
  } catch (cause) {
    console.error('Image analysis failed', cause)
    return NextResponse.json({ error: 'Image analysis failed.' }, { status: 400 })
  }
}
