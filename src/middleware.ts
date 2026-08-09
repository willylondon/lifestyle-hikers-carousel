import { NextRequest, NextResponse } from 'next/server'
import { authConfigured, SESSION_COOKIE, verifySessionToken } from '@/lib/auth'
import { consume } from '@/lib/rate-limit'

function clientKey(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || request.headers.get('x-real-ip') || 'unknown'
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isAi = pathname.startsWith('/api/ai/')

  if (isAi && process.env.OPENAI_API_KEY && !authConfigured()) {
    console.error('Blocked AI request: OPENAI_API_KEY is configured but APP_PASSWORD is not.')
    return NextResponse.json({ error: 'AI service unavailable.' }, { status: 503 })
  }

  if (isAi) {
    const rate = consume(`ai:${clientKey(request)}`)
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many requests.' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } }
      )
    }
  }

  if (!authConfigured()) return NextResponse.next()

  const authenticated = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)
  if (authenticated) return NextResponse.next()

  if (isAi) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  return NextResponse.redirect(new URL('/login', request.url))
}

export const config = {
  matcher: ['/api/ai/:path*', '/'],
}
