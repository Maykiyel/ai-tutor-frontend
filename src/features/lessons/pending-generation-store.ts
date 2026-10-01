import { create } from 'zustand'

/**
 * How often the list is re-read while a lesson is being written. Generation
 * "takes seconds to minutes", so this is a floor on how long a learner waits
 * after the lesson is already there, not a promise about generation time.
 */
export const LESSON_LIST_POLL_INTERVAL_MS = 5_000

/**
 * What the waiting state remembers: the highest lesson number the app had for
 * this workspace at the moment the learner asked. The wait ends when the list
 * holds a number higher than this.
 */
type PendingGeneration = {
  afterNumber: number
}

type PendingGenerationState = {
  pending: Record<string, PendingGeneration | undefined>
  start: (workspaceId: string, afterNumber: number) => void
  clear: (workspaceId: string) => void
  isGenerating: (workspaceId: string) => boolean
}

/**
 * The next-lesson waiting state, held above the page on purpose.
 *
 * Asking for a lesson takes seconds to minutes and the learner is not held on the
 * screen while it happens, so the state cannot be component state: unmounting the
 * list to read a lesson would lose it, and coming back would either hang or lie
 * about nothing being written. A module-level store outlives every screen in the
 * app, and keying it by workspace keeps two workspaces from waiting on each
 * other's lessons.
 *
 * There is no job id here and no job status endpoint, because none is agreed
 * (`docs/backend-onboarding.md` lists that as open). What the store holds is
 * therefore only what the app can observe for itself — the number it had — and
 * everything that decides the wait lives in the screens and the query that read
 * the list. If a job endpoint is agreed later it replaces the polling behind the
 * waiting state, and this store shrinks rather than moves.
 *
 * It is deliberately not persisted: a flag restored after a reload would claim a
 * generation is pending on the strength of a snapshot, and would poll for one
 * that may never have been queued.
 */
export const usePendingGenerationStore = create<PendingGenerationState>()((set, get) => ({
  pending: {},
  start: (workspaceId, afterNumber) =>
    set((state) => ({ pending: { ...state.pending, [workspaceId]: { afterNumber } } })),
  clear: (workspaceId) =>
    set((state) => {
      const next = { ...state.pending }
      delete next[workspaceId]

      return { pending: next }
    }),
  isGenerating: (workspaceId) => Boolean(get().pending[workspaceId]),
}))
