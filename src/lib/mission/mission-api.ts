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
 * A backend may answer "no mission here" with an empty body or with a 404,
 * because nothing in `docs/backend-onboarding.md` says which. Both mean the same
 * thing to this screen, so both come back as null. Any other failure is
 * rethrown so the screen can offer a retry.
 */
export async function getMission(workspaceId: string): Promise<Mission | null> {
  try {
    const response = await apiClient.get(missionEndpoints.mission(workspaceId))

    return missionResponseSchema.parse(response.data)
  } catch (error) {
    if (isNotFound(error)) {
      return null
    }

    throw error
  }
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    (error as { response?: { status?: number } }).response?.status === 404
  )
}
