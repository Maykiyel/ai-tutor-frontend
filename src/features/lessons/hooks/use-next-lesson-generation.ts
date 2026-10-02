import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { getHttpStatus } from '@/lib/api/http-status'
import { missionQueries } from '@/lib/mission/mission-queries'

import {
  LESSON_GENERATION_TIMEOUT_MS,
  usePendingGenerationStore,
  type PendingGeneration,
} from '../pending-generation-store'
import { lessonMutations } from '../queries/lesson-mutations'
import { lessonKeys } from '../queries/lesson-queries'
import { newestLessonNumber, type LessonList } from '../schemas/lesson-list-schema'

/**
 * Asking for the next lesson, and knowing when it has arrived.
 *
 * The three things this owns, and why they live together:
 *
 * - **Asking.** The flag goes up before the request is sent rather than after it
 *   is accepted, so the button cannot be pressed twice and the screen starts
 *   re-reading the list immediately. `afterNumber` is taken from the query cache
 *   at the moment of the press rather than from a render's props, so it is the
 *   newest lesson the app actually has, not one a stale closure remembers.
 * - **Failing.** A request that was refused clears the flag. Leaving it up would
 *   hold the learner on a wait for a generation that was never queued, which is
 *   the one way this state can hang.
 * - **Arriving.** The wait ends when the list holds a lesson numbered higher than
 *   it did when the learner asked. That comparison is the whole of the rule, and
 *   it is here rather than in the store so that a future job-status endpoint
 *   replaces one effect instead of the state above the page.
 * - **Not arriving.** A failed generation tells the app nothing, so after
 *   `LESSON_GENERATION_TIMEOUT_MS` the wait gives up and says so. The flag stays
 *   in the store, so a lesson that lands late still clears it, but polling stops.
 * - **Refused for a missing mission.** A 409 means the workspace has no active
 *   mission. The button is only offered when the app saw one, so this means the
 *   mission changed underneath the screen: the mission is read again, and the
 *   refusal is reported as itself rather than as a request to retry.
 */
export function useNextLessonGeneration(workspaceId: string, lessons: LessonList | undefined) {
  const pending = usePendingGenerationStore((state) => state.pending[workspaceId])
  const start = usePendingGenerationStore((state) => state.start)
  const clear = usePendingGenerationStore((state) => state.clear)
  const queryClient = useQueryClient()
  const request = useMutation(lessonMutations.next())

  const timedOut = useTimedOut(pending)
  const isGenerating = Boolean(pending) && !timedOut

  useEffect(() => {
    if (!pending || !lessons) {
      return
    }

    if (newestLessonNumber(lessons) > pending.afterNumber) {
      clear(workspaceId)
    }
  }, [clear, lessons, pending, workspaceId])

  const askForNextLesson = () => {
    const known = queryClient.getQueryData<LessonList>(lessonKeys.list(workspaceId))

    start(workspaceId, newestLessonNumber(known ?? []))

    request.mutate(workspaceId, {
      onError: (error) => {
        clear(workspaceId)

        if (getHttpStatus(error) === 409) {
          void queryClient.invalidateQueries({
            queryKey: missionQueries.mission(workspaceId).queryKey,
          })
        }
      },
    })
  }

  return {
    isGenerating,
    isAsking: request.isPending,
    timedOut,
    askFailed: request.isError,
    askRefusedForMission: request.isError && getHttpStatus(request.error) === 409,
    askForNextLesson,
  }
}

/**
 * Whether the wait has run past the cap.
 *
 * The answer depends on the clock, and nothing else changes when the cap passes:
 * no request settles and no store value moves. So it is held as state, set by a
 * timer armed for the time remaining, rather than worked out from `Date.now()`
 * during render. A value computed from the clock in render is one the React
 * Compiler is free to memoise against `pending` alone, and then it never changes.
 *
 * The state remembers *which* wait expired. A new request starts a new wait with
 * a new object, which is not the expired one, so asking again clears the timeout
 * without anything having to reset it.
 */
function useTimedOut(pending: PendingGeneration | undefined) {
  const [expired, setExpired] = useState<PendingGeneration | undefined>(undefined)

  useEffect(() => {
    if (!pending) {
      return
    }

    const remaining = pending.startedAt + LESSON_GENERATION_TIMEOUT_MS - Date.now()
    const timer = setTimeout(() => setExpired(pending), Math.max(remaining, 0))

    return () => clearTimeout(timer)
  }, [pending])

  return pending !== undefined && expired === pending
}
