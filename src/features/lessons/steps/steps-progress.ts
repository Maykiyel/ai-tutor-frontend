import { create } from 'zustand'

/**
 * Where a learner's place in a checklist lives between the click and the attempt.
 *
 * A steps block owns nothing but the list the learner is looking at: it renders
 * the steps and reports a tick here. **Submission is somebody else's job** — one
 * attempt is sent at the end of the lesson, carrying the answers from every
 * practice block, and that is a decision about the whole lesson rather than about
 * one block.
 *
 * Steps are telemetry rather than grading: the contract posts a `done` flag per
 * step and no feedback for it, because a hands-on lesson is judged by its recall
 * block rather than by how many boxes got ticked. So an absent entry means the
 * learner never touched the step, which is different from a step they ticked and
 * then unticked — the second leaves an explicit `false` behind.
 *
 * Keyed by lesson slug, so one lesson's checklist never shows up in another's.
 * The ticks are cleared when a steps block unmounts, because an attempt belongs to
 * one visit of one lesson: leaving the page and coming back starts a fresh one
 * rather than reporting progress against a list the learner can no longer see.
 */
export type StepsProgressMap = Record<string, boolean>

type StepsProgressState = {
  /** Slug of the lesson, to the steps ticked in it. */
  byLesson: Record<string, StepsProgressMap>
  set: (lessonSlug: string, stepId: string, done: boolean) => void
  forget: (lessonSlug: string) => void
}

export const useStepsProgress = create<StepsProgressState>((set) => ({
  byLesson: {},
  set: (lessonSlug, stepId, done) =>
    set((state) => ({
      byLesson: {
        ...state.byLesson,
        [lessonSlug]: { ...state.byLesson[lessonSlug], [stepId]: done },
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
 * Whether one step is ticked. `false` until the learner says otherwise, which is
 * what the checkbox renders as an unticked box rather than as something undefined.
 */
export function useStepDone(lessonSlug: string, stepId: string): boolean {
  return useStepsProgress((state) => state.byLesson[lessonSlug]?.[stepId] ?? false)
}

/**
 * Selected directly off the store rather than destructured from it, so the
 * identity is the one the store created once and never changes. The effect that
 * clears these ticks depends on `forget`, and a fresh identity every render would
 * re-run it on every render and untick the whole checklist under the learner.
 */
export function useSetStepDone(): StepsProgressState['set'] {
  return useStepsProgress((state) => state.set)
}

export function useForgetStepsProgress(): StepsProgressState['forget'] {
  return useStepsProgress((state) => state.forget)
}

/**
 * Everything ticked in one lesson, for whoever sends the attempt. Stable identity
 * while nothing changes, so it is safe to read from a submit handler.
 */
export function useLessonStepsProgress(lessonSlug: string): StepsProgressMap {
  return useStepsProgress((state) => state.byLesson[lessonSlug] ?? EMPTY)
}

const EMPTY: StepsProgressMap = {}
