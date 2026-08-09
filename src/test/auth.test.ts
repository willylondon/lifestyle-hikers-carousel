import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSessionToken, safeEqual, verifyPassword, verifySessionToken } from '@/lib/auth'
import { consume, resetRateLimit } from '@/lib/rate-limit'

const NOW = 1_800_000_000_000

describe('session authentication', () => {
  beforeEach(() => {
    process.env.APP_PASSWORD = 'correct horse battery staple'
    process.env.APP_SESSION_SECRET = 'separate-session-secret'
    vi.spyOn(Date, 'now').mockReturnValue(NOW)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete process.env.APP_PASSWORD
    delete process.env.APP_SESSION_SECRET
  })

  it('round-trips a valid session token', async () => {
    const token = await createSessionToken(NOW)
    expect(await verifySessionToken(token)).toBe(true)
  })

  it('rejects a tampered signature', async () => {
    const token = await createSessionToken(NOW)
    const [expiry, signature] = token.split('.')
    const tampered = `${expiry}.${signature.slice(0, -1)}${signature.endsWith('a') ? 'b' : 'a'}`
    expect(await verifySessionToken(tampered)).toBe(false)
  })

  it('rejects a forged later expiry with the old signature', async () => {
    const token = await createSessionToken(NOW)
    const [expiry, signature] = token.split('.')
    const forgedExpiry = String(Number(expiry) + 86_400)
    expect(await verifySessionToken(`${forgedExpiry}.${signature}`)).toBe(false)
  })

  it('rejects expired tokens', async () => {
    const token = await createSessionToken(NOW - 86_400_000)
    expect(await verifySessionToken(token)).toBe(false)
  })

  it('rejects password near misses and malformed candidates', async () => {
    expect(await verifyPassword('correct horse battery staple')).toBe(true)
    expect(await verifyPassword('correct horse battery stapl')).toBe(false)
    expect(await verifyPassword('')).toBe(false)
    expect(await verifyPassword(1234)).toBe(false)
  })

  it('safeEqual handles differing lengths without throwing', () => {
    expect(safeEqual('abc', 'abc')).toBe(true)
    expect(safeEqual('abc', 'abcd')).toBe(false)
    expect(safeEqual('', 'x')).toBe(false)
  })
})

describe('rate limiting', () => {
  beforeEach(() => resetRateLimit())

  it('enforces the per-minute limit with a positive Retry-After', () => {
    for (let i = 0; i < 10; i += 1) expect(consume('one', 1_000).allowed).toBe(true)
    const blocked = consume('one', 1_000)
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0)
  })

  it('isolates callers', () => {
    for (let i = 0; i < 10; i += 1) consume('one', 1_000)
    expect(consume('one', 1_000).allowed).toBe(false)
    expect(consume('two', 1_000).allowed).toBe(true)
  })

  it('releases the minute window over time', () => {
    for (let i = 0; i < 10; i += 1) consume('one', 1_000)
    expect(consume('one', 61_001).allowed).toBe(true)
  })

  it('enforces the daily ceiling across released minute windows', () => {
    for (let minute = 0; minute < 10; minute += 1) {
      const now = minute * 61_000
      for (let i = 0; i < 10; i += 1) expect(consume('daily', now).allowed).toBe(true)
    }
    const blocked = consume('daily', 10 * 61_000)
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0)
  })
})
