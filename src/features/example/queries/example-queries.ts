import { queryOptions } from '@tanstack/react-query'

import { getExampleItems } from '../api/example-api'

export const exampleQueries = {
  all: () =>
    queryOptions({
      queryKey: ['example', 'items'],
      queryFn: getExampleItems,
    }),
}
