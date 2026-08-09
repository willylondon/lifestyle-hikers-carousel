export const SESSION_COOKIE = 'lh_session'
export const SESSION_TTL_SECONDS = 60 * 60 * 12

const encoder = new TextEncoder()

export function authConfigured() {
  return Boolean(process.env.APP_PASSWORD)
}

function toBase64Url(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

async function sha256(value: string) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)))
}

async function hmac(value: string) {
  const secret = process.env.APP_SESSION_SECRET || process.env.APP_PASSWORD
  if (!secret) throw new Error('Application authentication is not configured.')
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)))
}

export function safeEqual(a: string, b: string) {
  const length = Math.max(a.length, b.length)
  let diff = a.length ^ b.length
  for (let i = 0; i < length; i += 1) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  }
  return diff === 0
}

export async function createSessionToken(now = Date.now()) {
  const expiry = Math.floor(now / 1000) + SESSION_TTL_SECONDS
  const signature = toBase64Url(await hmac(String(expiry)))
  return `${expiry}.${signature}`
}

export async function verifySessionToken(token: string | undefined | null) {
  if (!token || typeof token !== 'string') return false
  const [expiryText, signature, extra] = token.split('.')
  if (!expiryText || !signature || extra) return false
  if (!/^\d+$/.test(expiryText)) return false
  const expiry = Number(expiryText)
  if (!Number.isFinite(expiry) || expiry <= Math.floor(Date.now() / 1000)) return false
  try {
    const expected = toBase64Url(await hmac(expiryText))
    return safeEqual(signature, expected)
  } catch {
    return false
  }
}

export async function verifyPassword(candidate: unknown) {
  const configured = process.env.APP_PASSWORD
  if (typeof candidate !== 'string' || !candidate || !configured) return false
  const [candidateHash, configuredHash] = await Promise.all([sha256(candidate), sha256(configured)])
  return safeEqual(toBase64Url(candidateHash), toBase64Url(configuredHash))
}
