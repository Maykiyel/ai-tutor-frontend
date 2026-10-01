import { useState, type PropsWithChildren, type ReactElement } from 'react'
import { MantineProvider } from '@mantine/core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, type RenderOptions } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
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
  // One client per mounted wrapper, not one per render. Building it in the
  // render body threw the cache away on every re-render, so a query that had
  // already resolved went back to `isPending` the moment anything else caused a
  // render. A screen that renders its data then its empty or error branch would
  // oscillate between them, and an assertion could catch it mid-swing — which is
  // how a correct screen produced an intermittent "unable to find" failure.
  //
  // The lazy initialiser gives every render its own client while guaranteeing it
  // is created exactly once per mount.
  const [queryClient] = useState(createTestQueryClient)

  return (
    // `env="test"` makes Mantine skip transitions outright. Without it a dropdown
    // is mounted and then hidden by an asynchronous floating transition, so an
    // item can be in the DOM while an accessibility query still reports it as
    // absent — which is a timing accident, not a behaviour.
    <MantineProvider env="test">
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

/**
 * For a screen that renders router links. A screen reached through the real
 * router config belongs in `src/app/router.test.tsx`; this is for a single
 * screen whose links only need somewhere to point.
 */
export function renderWithRouter(ui: ReactElement, initialEntries: string[] = ['/']) {
  return renderWithProviders(<MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>)
}

export * from '@testing-library/react'
