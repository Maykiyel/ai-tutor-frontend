import type { PropsWithChildren, ReactElement } from 'react'
import { MantineProvider } from '@mantine/core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, type RenderOptions } from '@testing-library/react'
import { afterEach } from 'vitest'

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })
}

function TestProviders({ children }: PropsWithChildren) {
  const queryClient = createTestQueryClient()

  return (
    <MantineProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MantineProvider>
  )
}

// Testing Library only auto-registers cleanup when `afterEach` is a global,
// which requires Vitest `globals: true`. This project does not enable it, so
// unmount explicitly or rendered DOM leaks between tests in a file.
afterEach(() => {
  cleanup()
})

export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, {
    wrapper: TestProviders,
    ...options,
  })
}

export * from '@testing-library/react'
