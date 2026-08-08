import { NextResponse } from 'next/server'
import { getAIMode } from '@/lib/ai/service-factory'

export async function GET() {
  return NextResponse.json({ mode: getAIMode() })
}
