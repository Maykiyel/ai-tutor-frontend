import { create } from 'zustand'

/**
 * How often the list is re-read while a lesson is being written. Generation
 * "takes seconds to minutes", so this is a floor on how long a learner waits
 * after the lesson is already there, not a promise about generation time.
 */
export const LESSON_LIST_POLL_INTERVAL_MS = 5_000

/**
 * How long the app waits for a lesson before saying it did not arrive.
 *
 * The backend queues the job, tries the model up to three times, and stores
 * nothing if every try fails. Nothing tells the app that happened: there is no
 * job status endpoint, so a failed generation and a slow one look the same from
 * here. Without a cap the waiting state would poll forever. Ten minutes is well
 * past a slow generation, and asking again after it is safe, because the backend
 * never queues two lessons for one workspace at once.
 */
export const LESSON_GENERATION_TIMEOUT_MS = 10 * 60_000

/**
 * What the waiting state remembers: the highest lesson number the app had for
 * this workspace at the moment the learner asked, and when they asked. The wait
 * ends when the list holds a number higher than `afterNumber`, or gives up once
 * `LESSON_GENERATION_TIMEOUT_MS` has passed since `startedAt`.
 */
export type PendingGeneration = {
  afterNumber: number
  startedAt: number
}

/** Whether a wait has run past the cap, as of `now`. */
export function hasTimedOut(pending: PendingGeneration, now = Date.now()): boolean {
  return now - pending.startedAt >= LESSON_GENERATION_TIMEOUT_MS
}

type PendingGenerationState = {
  pending: Record<string, PendingGeneration | undefined>
  start: (workspaceId: string, afterNumber: number) => void
  clear: (workspaceId: string) => void
  /** Waiting, and not yet past the cap. A wait that timed out polls no more. */
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
    set((state) => ({
      pending: { ...state.pending, [workspaceId]: { afterNumber, startedAt: Date.now() } },
    })),
  clear: (workspaceId) =>
    set((state) => {
      const next = { ...state.pending }
      delete next[workspaceId]

      return { pending: next }
    }),
  isGenerating: (workspaceId) => {
    const pending = get().pending[workspaceId]

    return pending !== undefined && !hasTimedOut(pending)
  },
}))
