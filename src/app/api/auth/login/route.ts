import { NextResponse } from 'next/server'
import { authConfigured, createSessionToken, SESSION_COOKIE, SESSION_TTL_SECONDS, verifyPassword } from '@/lib/auth'
import { consume } from '@/lib/rate-limit'

function requestIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || request.headers.get('x-real-ip') || 'unknown'
}

export async function POST(request: Request) {
  const rate = consume(`login:${requestIp(request)}`)
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } })
  }

  if (!authConfigured()) {
    return NextResponse.json({ error: 'Authentication is not configured.' }, { status: 503 })
  }

  let password: unknown
  try {
    const payload = await request.json()
    password = payload?.password
  } catch {
    password = undefined
  }

  if (!(await verifyPassword(password))) {
    return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set({
    name: SESSION_COOKIE,
    value: await createSessionToken(),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  })
  return response
}
