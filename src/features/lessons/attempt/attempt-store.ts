import { create } from 'zustand'

import type { AttemptRequest, AttemptResult } from '../schemas/attempt-schema'

/**
 * What one submitted attempt came back as, kept for as long as the lesson is open.
 *
 * The request is held beside the result on purpose. A submitted attempt stays on
 * screen, and the practice blocks it came from stay on screen with it: so the
 * blocks need to show what was sent after the live answer maps have been cleared,
 * and re-reading the learner's own words from a request the backend received is
 * more honest than keeping a second copy of them in a scratch map that nobody can
 * tell apart from an attempt still being composed.
 *
 * The three indexes are built from the request's own union, so `type` is what
 * decides which map an answer lands in. An omitted answer simply has no entry,
 * which is what keeps a skipped question looking skipped in the block too.
 */
export type SubmittedAttempt = {
  /** The option chosen for each answered quiz question, by question id. */
  quiz: Record<string, string>
  /** The text written for each touched recall prompt, by recall id. */
  recall: Record<string, string>
  /** Whether each step was done, by step id. Every step the lesson has is here. */
  steps: Record<string, boolean>
  /** What the backend made of the attempt. */
  result: AttemptResult
}

type SubmittedAttemptsState = {
  /** Slug of the lesson, to the attempt submitted in it. */
  byLesson: Record<string, SubmittedAttempt>
  record: (lessonSlug: string, request: AttemptRequest, result: AttemptResult) => void
  forget: (lessonSlug: string) => void
}

export const useSubmittedAttempts = create<SubmittedAttemptsState>((set) => ({
  byLesson: {},
  record: (lessonSlug, request, result) =>
    set((state) => ({
      byLesson: {
        ...state.byLesson,
        [lessonSlug]: indexAnswers(request, result),
      },
    })),
  forget: (lessonSlug) =>
    set((state) => {
      const byLesson = { ...state.byLesson }
      delete byLesson[lessonSlug]

      return { byLesson }
    }),
}))

function indexAnswers(request: AttemptRequest, result: AttemptResult): SubmittedAttempt {
  const quiz: Record<string, string> = {}
  const recall: Record<string, string> = {}
  const steps: Record<string, boolean> = {}

  for (const answer of request.answers) {
    switch (answer.type) {
      case 'quiz':
        quiz[answer.questionId] = answer.optionId
        break
      case 'recall':
        recall[answer.recallId] = answer.text
        break
      case 'steps':
        steps[answer.stepId] = answer.done
        break
    }
  }

  return { quiz, recall, steps, result }
}

/** The attempt submitted in this lesson, if there is one. */
export function useSubmittedAttempt(lessonSlug: string): SubmittedAttempt | undefined {
  return useSubmittedAttempts((state) => state.byLesson[lessonSlug])
}

/**
 * Whether this lesson's attempt has been sent. A block reads this to lock itself,
 * so the learner is told their answers cannot change any more by being unable to
 * change them rather than by being told they cannot.
 */
export function useAttemptSent(lessonSlug: string): boolean {
  return useSubmittedAttempts((state) => Boolean(state.byLesson[lessonSlug]))
}

export function useRecordSubmittedAttempt(): SubmittedAttemptsState['record'] {
  return useSubmittedAttempts((state) => state.record)
}

/**
 * Selected straight off the store, so its identity is fixed and an effect that
 * clears on unmount runs once rather than once per render.
 */
export function useForgetSubmittedAttempt(): SubmittedAttemptsState['forget'] {
  return useSubmittedAttempts((state) => state.forget)
}
