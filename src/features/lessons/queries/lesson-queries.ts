import { queryOptions } from '@tanstack/react-query'

import { getLesson, listLessons } from '../api/lesson-api'

export const lessonKeys = {
  all: ['lessons'] as const,
  list: (workspaceId: string) => [...lessonKeys.all, 'list', workspaceId] as const,
  detail: (lessonId: string) => [...lessonKeys.all, 'detail', lessonId] as const,
}

export const lessonQueries = {
  list: (workspaceId: string) =>
    queryOptions({
      queryKey: lessonKeys.list(workspaceId),
      queryFn: () => listLessons(workspaceId),
      enabled: Boolean(workspaceId),
    }),

  detail: (lessonId: string) =>
    queryOptions({
      queryKey: lessonKeys.detail(lessonId),
      queryFn: () => getLesson(lessonId),
      enabled: Boolean(lessonId),
    }),
}
