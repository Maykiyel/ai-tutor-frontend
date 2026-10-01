import { useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { usePendingGenerationStore } from '../pending-generation-store'
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
 */
export function useNextLessonGeneration(workspaceId: string, lessons: LessonList | undefined) {
  const pending = usePendingGenerationStore((state) => state.pending[workspaceId])
  const start = usePendingGenerationStore((state) => state.start)
  const clear = usePendingGenerationStore((state) => state.clear)
  const queryClient = useQueryClient()
  const request = useMutation(lessonMutations.next())

  const isGenerating = Boolean(pending)

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
      onError: () => clear(workspaceId),
    })
  }

  return {
    isGenerating,
    isAsking: request.isPending,
    askFailed: request.isError,
    askForNextLesson,
  }
}
