import { QueryClient } from '@tanstack/react-query'
import type { DefaultOptions } from '@tanstack/react-query'

const defaultOptions = {
  queries: {
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  },
} satisfies DefaultOptions

export const queryClient = new QueryClient({
  defaultOptions,
})
