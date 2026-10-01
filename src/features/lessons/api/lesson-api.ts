import { apiClient } from '@/lib/api/client'

import { lessonListResponseSchema, type LessonList } from '../schemas/lesson-list-schema'
import { parseLessonResponse, type ParsedLessonResponse } from '../schemas/lesson-schema'
import { lessonEndpoints } from './lesson-endpoints'

export async function listLessons(workspaceId: string): Promise<LessonList> {
  const response = await apiClient.get(lessonEndpoints.listForWorkspace(workspaceId))

  return lessonListResponseSchema.parse(response.data)
}

/**
 * Asks for the workspace's next lesson.
 *
 * The endpoint queues a job and answers `202`, so what comes back is an
 * acceptance rather than a lesson — and nothing about that body is agreed, which
 * is why nothing here parses it. There is no job id to keep and no job status to
 * poll: the screen shows a waiting state and the list is re-read until the lesson
 * shows up in it. If a job endpoint is agreed later, this is the only call that
 * changes.
 */
export async function requestNextLesson(workspaceId: string): Promise<void> {
  await apiClient.post(lessonEndpoints.nextForWorkspace(workspaceId))
}

/**
 * The header and the hydrated maps are parsed here, strictly for the header and
 * leniently for the maps, so a response that cannot be read fails as a request
 * and the screen shows its retryable error state. `blocks` is deliberately left
 * unparsed: it is parsed one entry at a time by the reader, so one broken block
 * never fails the request. See ADR-0002.
 */
export async function getLesson(lessonId: string): Promise<ParsedLessonResponse> {
  const response = await apiClient.get(lessonEndpoints.byId(lessonId))

  return parseLessonResponse(response.data)
}
