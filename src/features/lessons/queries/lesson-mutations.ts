import { mutationOptions } from '@tanstack/react-query'

import { requestNextLesson } from '../api/lesson-api'

export const lessonMutations = {
  /**
   * Asks for the workspace's next lesson. The request either is accepted or it
   * is not; what it resolves to is not part of any contract, so it carries
   * nothing. The workspace id is the mutation's variable rather than a factory
   * argument so one mutation serves every workspace.
   */
  next: () =>
    mutationOptions({
      mutationFn: (workspaceId: string) => requestNextLesson(workspaceId),
    }),
}
