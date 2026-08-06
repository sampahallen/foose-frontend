import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => cleanup())

class IntersectionObserverMock implements IntersectionObserver {
  readonly root = null
  readonly rootMargin = ''
  readonly scrollMargin = ''
  readonly thresholds = [0]
  disconnect = vi.fn()
  observe = vi.fn()
  takeRecords = vi.fn(() => [])
  unobserve = vi.fn()
}

class ResizeObserverMock implements ResizeObserver {
  disconnect = vi.fn()
  observe = vi.fn()
  unobserve = vi.fn()
}

vi.stubGlobal('IntersectionObserver', IntersectionObserverMock)
vi.stubGlobal('ResizeObserver', ResizeObserverMock)
Object.defineProperty(window, 'scrollTo', { configurable: true, value: vi.fn() })

// jsdom does not implement matchMedia; individual tests can still override
// this with their own vi.stubGlobal for a specific `matches` value. Kept as a
// plain function (not vi.fn) so restoreMocks doesn't reset it between tests.
vi.stubGlobal('matchMedia', (query: string) => ({
  addEventListener: () => {},
  addListener: () => {},
  dispatchEvent: () => false,
  matches: false,
  media: query,
  onchange: null,
  removeEventListener: () => {},
  removeListener: () => {},
}))
