import { mutationOptions } from '@tanstack/react-query'

import { requestNextLesson, submitAttempt } from '../api/lesson-api'
import type { AttemptRequest } from '../schemas/attempt-schema'

export type SubmitAttemptVariables = {
  lessonId: string
  attempt: AttemptRequest
}

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

  /**
   * Sends the one attempt a visit of a lesson produces. The lesson id travels as
   * part of the variable rather than as a factory argument, for the same reason
   * the workspace id does: one mutation serves every lesson.
   *
   * There is nothing to invalidate. The attempt is the end of a visit — the
   * learner has already read the lesson, and re-reading it would only replace the
   * lesson they just answered with a fresh one and lose the attempt they just
   * made, which is exactly what `docs/lesson-schema.json` keeps no score for.
   */
  submitAttempt: () =>
    mutationOptions({
      mutationFn: ({ lessonId, attempt }: SubmitAttemptVariables) =>
        submitAttempt(lessonId, attempt),
    }),
}
