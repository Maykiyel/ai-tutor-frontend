import { queryOptions } from '@tanstack/react-query'

import { getLesson, listLessons } from '../api/lesson-api'
import {
  LESSON_LIST_POLL_INTERVAL_MS,
  usePendingGenerationStore,
} from '../pending-generation-store'

export const lessonKeys = {
  all: ['lessons'] as const,
  list: (workspaceId: string) => [...lessonKeys.all, 'list', workspaceId] as const,
  detail: (lessonId: string) => [...lessonKeys.all, 'detail', lessonId] as const,
}

export const lessonQueries = {
  /**
   * Re-read on an interval only while a lesson is being written for this
   * workspace, and never otherwise: a list that polls forever is a request every
   * learner pays for on every screen and gets nothing from.
   *
   * The pending flag is read through `getState` rather than taken as an argument
   * because it lives above the page and the query outlives any single render of
   * the screen. The interval is a function so a flag that flips while the screen
   * is open is picked up on the next tick, not baked in when the query was built.
   *
   * This one function is the whole of the "how does the app learn a job
   * finished" question. There is no job id and no job status endpoint, because
   * neither is agreed (`docs/backend-onboarding.md` records that as open); if one
   * is agreed, it replaces this and nothing else moves.
   */
  list: (workspaceId: string) =>
    queryOptions({
      queryKey: lessonKeys.list(workspaceId),
      queryFn: () => listLessons(workspaceId),
      enabled: Boolean(workspaceId),
      refetchInterval: () =>
        usePendingGenerationStore.getState().isGenerating(workspaceId)
          ? LESSON_LIST_POLL_INTERVAL_MS
          : false,
    }),

  detail: (lessonId: string) =>
    queryOptions({
      queryKey: lessonKeys.detail(lessonId),
      queryFn: () => getLesson(lessonId),
      enabled: Boolean(lessonId),
    }),
}
