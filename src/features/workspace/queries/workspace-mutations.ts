import { mutationOptions } from '@tanstack/react-query'

import { createWorkspace } from '../api/workspace-api'

export const workspaceMutations = {
  create: () =>
    mutationOptions({
      mutationFn: createWorkspace,
    }),
}
