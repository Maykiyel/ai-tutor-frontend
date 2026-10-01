import { create } from 'zustand'

/**
 * Where the learner's picks live between picking one and submitting the attempt.
 *
 * A quiz block owns nothing but the question the learner is looking at: it renders
 * its options, and it reports a pick here. **Submission is somebody else's job**
 * — one attempt is sent at the end of the lesson, carrying the answers from every
 * practice block, and that is a decision about the whole lesson rather than about
 * one block. Keeping it here is what lets a block be added without the reader
 * having to learn about it, and what lets the submitter gather answers it does not
 * render.
 *
 * The shape is the answer the contract posts: `questionId` to the option the
 * learner chose. A question with no entry is one the learner skipped, which the
 * contract defines as omitted from the attempt and excluded from grading — so the
 * absence of an entry is meaningful and is not the same thing as an empty answer.
 *
 * Keyed by lesson slug, so one lesson's picks never show up in another's. The
 * answers are cleared when a quiz block unmounts, because an attempt belongs to
 * one visit of one lesson: leaving the page and coming back starts a fresh one
 * rather than submitting answers to a question the learner can no longer see.
 */
export type QuizAnswerMap = Record<string, string>

type QuizAnswersState = {
  /** Slug of the lesson, to the answers picked in it. */
  byLesson: Record<string, QuizAnswerMap>
  choose: (lessonSlug: string, questionId: string, optionId: string) => void
  forget: (lessonSlug: string) => void
}

export const useQuizAnswers = create<QuizAnswersState>((set) => ({
  byLesson: {},
  choose: (lessonSlug, questionId, optionId) =>
    set((state) => ({
      byLesson: {
        ...state.byLesson,
        [lessonSlug]: { ...state.byLesson[lessonSlug], [questionId]: optionId },
      },
    })),
  forget: (lessonSlug) =>
    set((state) => {
      const byLesson = { ...state.byLesson }
      delete byLesson[lessonSlug]

      return { byLesson }
    }),
}))

/**
 * Subscribe to one question's answer. `undefined` until the learner picks
 * something, which is what the block renders as "not answered yet".
 */
export function useQuizAnswer(lessonSlug: string, questionId: string): string | undefined {
  return useQuizAnswers((state) => state.byLesson[lessonSlug]?.[questionId])
}

export function useChooseQuizOption(): QuizAnswersState['choose'] {
  return useQuizAnswers((state) => state.choose)
}

export function useForgetQuizAnswers(): QuizAnswersState['forget'] {
  return useQuizAnswers((state) => state.forget)
}

/**
 * Everything picked in one lesson, for whoever sends the attempt. Stable identity
 * while nothing changes, so it is safe to read from a submit handler.
 */
export function useLessonQuizAnswers(lessonSlug: string): QuizAnswerMap {
  return useQuizAnswers((state) => state.byLesson[lessonSlug] ?? EMPTY)
}

const EMPTY: QuizAnswerMap = {}
