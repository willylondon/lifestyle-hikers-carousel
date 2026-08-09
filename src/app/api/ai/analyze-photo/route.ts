import { NextResponse } from 'next/server'
import { createAIService, getAIMode } from '@/lib/ai/service-factory'
import { analyzePhotoSchema } from '@/lib/validation'

export async function POST(request: Request) {
  try {
    const payload = analyzePhotoSchema.parse(await request.json())
    const service = createAIService()
    const [analysis] = await service.analyzeImages({
      projectTitle: payload.title,
      location: payload.location,
      notes: payload.notes,
      photos: [payload.photo],
    })

    return NextResponse.json({ mode: getAIMode(), analysis })
  } catch (cause) {
    console.error('Photo analysis failed', cause)
    return NextResponse.json({ error: 'Photo analysis failed.' }, { status: 400 })
  }
}
