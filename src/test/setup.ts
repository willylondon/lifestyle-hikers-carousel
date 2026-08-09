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
  globalThis.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
    callback(Date.now())
    return 1
  }) as typeof requestAnimationFrame
}
if (!globalThis.cancelAnimationFrame) {
  globalThis.cancelAnimationFrame = vi.fn() as typeof cancelAnimationFrame
}
