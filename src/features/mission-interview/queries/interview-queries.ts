import { mutationOptions, queryOptions } from '@tanstack/react-query'

import { sendInterviewMessage } from '../api/interview-api'
import type { AnsweredQuestion } from '../lib/answers-to-prompt'
import type { InterviewTurn } from '../schemas/interview-schema'

export type TranscriptEntry =
  { role: 'learner'; answers: AnsweredQuestion[] } | { role: 'tutor'; turn: InterviewTurn }

export type InterviewTranscript = {
  conversationId: string | null
  entries: TranscriptEntry[]
}

export const emptyTranscript: InterviewTranscript = { conversationId: null, entries: [] }

/**
 * The interview is a chat, and the onboarding doc asks for its messages to live
 * in the query cache and be appended as they arrive. Nothing fetches it: the
 * cache is the store, so it never goes stale and is never collected while the
 * app is open, and leaving the screen and coming back finds the interview where
 * it was.
 *
 * Two things follow from it being in the cache rather than a module store. A
 * sign-out, or a 401 that ends the session, clears the cache and with it the
 * transcript, so one learner's answers are never shown to the next. And the key
 * deliberately sits outside `['workspaces']`: invalidating the workspaces after
 * a change must not wipe an interview in progress, which a refetch of this
 * placeholder query would do.
 */
export const interviewKeys = {
  transcript: (workspaceId: string) => ['mission-interview', workspaceId] as const,
}

export const interviewQueries = {
  transcript: (workspaceId: string) =>
    queryOptions({
      queryKey: interviewKeys.transcript(workspaceId),
      queryFn: () => emptyTranscript,
      initialData: emptyTranscript,
      staleTime: Infinity,
      gcTime: Infinity,
    }),
}

export type SendInterviewMessageVariables = {
  prompt: string
  conversationId: string | null
  /** What the transcript shows for the learner's side once the tutor has replied. */
  answers: AnsweredQuestion[]
}

export const interviewMutations = {
  send: () =>
    mutationOptions({
      mutationFn: ({ prompt, conversationId }: SendInterviewMessageVariables) =>
        sendInterviewMessage({ prompt, conversationId }),
    }),
}
