import { mutationOptions } from '@tanstack/react-query'

import { createExampleItem } from '../api/example-api'

export const exampleMutations = {
  create: () =>
    mutationOptions({
      mutationFn: createExampleItem,
    }),
}
