import 'fake-indexeddb/auto'
import { vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: vi.fn(),
    refresh: vi.fn(),
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

if (!URL.createObjectURL) {
  URL.createObjectURL = vi.fn(() => 'blob:test')
}
if (!URL.revokeObjectURL) {
  URL.revokeObjectURL = vi.fn()
}

if (!globalThis.requestAnimationFrame) {
  globalThis.requestAnimationFrame = ((callback: FrameRequestCallback) => setTimeout(() => callback(Date.now()), 0)) as typeof requestAnimationFrame
}
if (!globalThis.cancelAnimationFrame) {
  globalThis.cancelAnimationFrame = ((id: number) => clearTimeout(id)) as typeof cancelAnimationFrame
}
