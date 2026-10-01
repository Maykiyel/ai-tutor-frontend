import { create } from 'zustand'

/**
 * Where a typed recall answer lives between the keystroke and the attempt.
 *
 * A recall block owns nothing but the prompt the learner is looking at: it
 * renders a text area and reports what is typed here. **Submission is somebody
 * else's job** — one attempt is sent at the end of the lesson, carrying the
 * answers from every practice block, and that is a decision about the whole
 * lesson rather than about one block. Keeping it here is what lets a block be
 * added without the reader having to learn about it, and what lets the submitter
 * gather answers it does not render.
 *
 * The map is the answer the contract posts: `recallId` to the text. A prompt
 * with no entry is one the learner skipped, which the contract defines as omitted
 * from the attempt and excluded from grading — so the absence of an entry is
 * meaningful and is not the same thing as an empty answer.
 *
 * Keyed by lesson slug, so one lesson's answers never show up in another's. The
 * answers are cleared when a recall block unmounts, because an attempt belongs to
 * one visit of one lesson: leaving the page and coming back starts a fresh one
 * rather than submitting an answer to a prompt the learner can no longer see.
 *
 * **Only the typed text lives here.** The expected answer and the rubric are not
 * in this file, not in the block schema, and not anywhere else in the reader:
 * they come back in the attempt result, after the learner has submitted.
 */
export type RecallAnswerMap = Record<string, string>

type RecallAnswersState = {
  /** Slug of the lesson, to the answers written in it. */
  byLesson: Record<string, RecallAnswerMap>
  write: (lessonSlug: string, recallId: string, text: string) => void
  forget: (lessonSlug: string) => void
}

export const useRecallAnswers = create<RecallAnswersState>((set) => ({
  byLesson: {},
  write: (lessonSlug, recallId, text) =>
    set((state) => ({
      byLesson: {
        ...state.byLesson,
        [lessonSlug]: { ...state.byLesson[lessonSlug], [recallId]: text },
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
 * What one prompt currently says. `''` until the learner types, which is what the
 * text area renders as an empty field rather than as something undefined.
 */
export function useRecallAnswer(lessonSlug: string, recallId: string): string {
  return useRecallAnswers((state) => state.byLesson[lessonSlug]?.[recallId] ?? '')
}

/**
 * Selected directly off the store rather than destructured from it, so the
 * identity is the one the store created once and never changes. An effect that
 * clears these answers depends on this function: a fresh identity every render
 * would re-run that effect on every render and wipe the sentence the learner is
 * halfway through typing.
 */
export function useWriteRecallAnswer(): RecallAnswersState['write'] {
  return useRecallAnswers((state) => state.write)
}

export function useForgetRecallAnswers(): RecallAnswersState['forget'] {
  return useRecallAnswers((state) => state.forget)
}

/**
 * Everything written in one lesson, for whoever sends the attempt. Stable
 * identity while nothing changes, so it is safe to read from a submit handler.
 */
export function useLessonRecallAnswers(lessonSlug: string): RecallAnswerMap {
  return useRecallAnswers((state) => state.byLesson[lessonSlug] ?? EMPTY)
}

const EMPTY: RecallAnswerMap = {}
