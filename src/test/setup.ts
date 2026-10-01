import '@testing-library/jest-dom/vitest'

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
