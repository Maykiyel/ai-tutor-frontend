import { apiClient } from '@/lib/api/client'

import { missionEndpoints } from './mission-endpoints'
import { missionResponseSchema, type Mission } from './mission-schema'

/**
 * Reads the mission the learner has for this workspace, or null when they have
 * none — a normal state, not a failure, so it comes back as data rather than an
 * error.
 *
 * Shared between the workspace home and the lesson list; see `mission-schema.ts`
 * for why it is not owned by a feature.
 *
 * "No mission here" is 200 with `data: null`, as agreed with the backend, and
 * parses to null. A 404 is not that: it means the workspace is not the
 * learner's, so it is left to fail like any other error and the screen offers a
 * retry rather than claiming the workspace simply has no mission.
 */
export async function getMission(workspaceId: string): Promise<Mission | null> {
  const response = await apiClient.get(missionEndpoints.mission(workspaceId))

  return missionResponseSchema.parse(response.data)
}
