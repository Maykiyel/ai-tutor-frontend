import { configure } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

/**
 * Give async queries a wider default budget than Testing Library's 1000ms.
 *
 * Every screen in this app reads through TanStack Query, so a test that asserts
 * on data has to wait for the query to settle. That settle time tracks how busy
 * the machine is: on an idle laptop it is imperceptible, while on a loaded CI
 * runner — or a machine running this suite alongside a build — a single render
 * pass can outlast the default. The result is a suite that is green locally and
 * intermittently red in CI, failing on screens whose behaviour was entirely
 * correct, which is the worst kind of failure to chase because it teaches you
 * nothing about the code.
 *
 * Widening the budget once, here, is the honest fix: it costs a few seconds only
 * on the runs that were going to fail anyway, and it means a red test means the
 * behaviour changed rather than that the machine was busy. Nothing waits longer
 * than it has to — `findBy*` returns the instant the element appears.
 */
configure({ asyncUtilTimeout: 5000 })

// jsdom implements neither matchMedia nor ResizeObserver, both of which Mantine
// calls on mount — matchMedia for colour-scheme handling, ResizeObserver for
// ScrollArea. Stub them so those components can render in tests.
if (typeof window !== 'undefined' && !('ResizeObserver' in window)) {
  Object.defineProperty(window, 'ResizeObserver', {
    writable: true,
    value: class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  })
}

if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}
