import { queryOptions } from '@tanstack/react-query'

import { getMission } from '../api/mission-api'
import { workspaceKeys } from './workspace-queries'

/**
 * The mission hangs off the workspace, so its key is a child of the workspace
 * detail key. Anything that replaces a workspace's mission can invalidate it by
 * invalidating the workspace.
 */
export const missionKeys = {
  mission: (workspaceId: string) => [...workspaceKeys.detail(workspaceId), 'mission'] as const,
}

export const missionQueries = {
  mission: (workspaceId: string) =>
    queryOptions({
      queryKey: missionKeys.mission(workspaceId),
      queryFn: () => getMission(workspaceId),
      enabled: Boolean(workspaceId),
    }),
}
