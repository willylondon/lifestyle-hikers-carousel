import { NextResponse } from 'next/server'
import { createAIService, getAIMode } from '@/lib/ai/service-factory'
import { captionSchema } from '@/lib/validation'

export async function POST(request: Request) {
  try {
    const payload = captionSchema.parse(await request.json())
    const service = createAIService()
    const caption = await service.generateCaption({
      title: payload.title,
      location: payload.location,
      notes: payload.notes,
      slides: payload.slides,
    })

    return NextResponse.json({ mode: getAIMode(), caption })
  } catch {
    return NextResponse.json({ error: 'Caption generation failed.' }, { status: 400 })
  }
}
