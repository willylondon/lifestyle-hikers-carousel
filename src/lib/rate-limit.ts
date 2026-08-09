// Per-instance sliding-window limiter. State resets on cold start and is not shared across
// Vercel instances. This is defense in depth, not a substitute for authentication or a
// hard OpenAI project budget/spend cap.
export const RATE_LIMIT_RULES = [
  { limit: 10, windowMs: 60_000 },
  { limit: 100, windowMs: 86_400_000 },
] as const

const MAX_KEYS = 10_000
const events = new Map<string, number[]>()

function prune(now: number) {
  if (events.size <= MAX_KEYS) return
  const longestWindow = Math.max(...RATE_LIMIT_RULES.map((rule) => rule.windowMs))
  for (const [key, timestamps] of events) {
    const recent = timestamps.filter((timestamp) => now - timestamp < longestWindow)
    if (recent.length === 0) events.delete(key)
    else events.set(key, recent)
    if (events.size <= MAX_KEYS) break
  }
}

export function consume(key: string, now = Date.now()) {
  prune(now)
  const longestWindow = Math.max(...RATE_LIMIT_RULES.map((rule) => rule.windowMs))
  const existing = (events.get(key) ?? []).filter((timestamp) => now - timestamp < longestWindow)

  for (const rule of RATE_LIMIT_RULES) {
    const inWindow = existing.filter((timestamp) => now - timestamp < rule.windowMs)
    if (inWindow.length >= rule.limit) {
      const oldest = inWindow[0]
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((rule.windowMs - (now - oldest)) / 1000)) }
    }
  }

  existing.push(now)
  events.set(key, existing)
  return { allowed: true, retryAfterSeconds: 0 }
}

export function resetRateLimit() {
  events.clear()
}
