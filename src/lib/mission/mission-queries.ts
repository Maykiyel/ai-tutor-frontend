import { queryOptions } from '@tanstack/react-query'

import { getMission } from './mission-api'

/**
 * The mission hangs off the workspace, so its key sits under the same root the
 * workspace keys use. It lives in `src/lib` rather than in either feature
 * because two features now ask the same question — "does this workspace have an
 * active mission?" — and features do not import from one another. The key is
 * spelled out here rather than derived from the workspace feature's keys,
 * because that would be exactly such an import.
 *
 * Invalidation still lines up: invalidating `['workspaces']` reaches the
 * mission, which is what any replacement of a workspace's mission needs.
 */
export const missionKeys = {
  all: ['workspaces'] as const,
  mission: (workspaceId: string) => [...missionKeys.all, workspaceId, 'mission'] as const,
}

export const missionQueries = {
  mission: (workspaceId: string) =>
    queryOptions({
      queryKey: missionKeys.mission(workspaceId),
      queryFn: () => getMission(workspaceId),
      enabled: Boolean(workspaceId),
    }),
}
