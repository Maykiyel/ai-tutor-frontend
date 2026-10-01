import { queryOptions } from '@tanstack/react-query'

import { getWorkspace, listWorkspaces } from '../api/workspace-api'

export const workspaceKeys = {
  all: ['workspaces'] as const,
  list: () => [...workspaceKeys.all, 'list'] as const,
  detail: (workspaceId: string) => [...workspaceKeys.all, 'detail', workspaceId] as const,
}

export const workspaceQueries = {
  list: () =>
    queryOptions({
      queryKey: workspaceKeys.list(),
      queryFn: listWorkspaces,
    }),

  detail: (workspaceId: string) =>
    queryOptions({
      queryKey: workspaceKeys.detail(workspaceId),
      queryFn: () => getWorkspace(workspaceId),
      enabled: Boolean(workspaceId),
    }),
}
