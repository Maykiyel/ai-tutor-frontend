import { z } from 'zod'

/**
 * A Zod mirror of the attempt half of `docs/lesson-schema.json`: `attemptRequest`,
 * the `answer` union it posts, and `attemptResult` with its `perAnswer` entries.
 *
 * The schema file is authoritative and this file only translates it, so a contract
 * change shows up here as a parse failure rather than as a mystery in the result
 * view. Two things are deliberate departures from a literal translation:
 *
 * - **The answer union is `discriminatedUnion` on `type`,** which is the whole
 *   point of the union in the contract. A blank recall and a malformed quiz answer
 *   are then not merely rejected: they are *not the same shape*, so nothing that
 *   builds a request has to remember which is which. A loose object with optional
 *   fields would let `{ questionId, text }` through, which is exactly the mistake
 *   the union exists to prevent.
 * - **`perAnswer` has no steps arm.** The contract says no steps entry ever appears
 *   there, so a response carrying one is a contract breach and fails the parse
 *   rather than rendering a tick as though it had been graded. See
 *   `docs/lesson-schema.json` and the `stepsAnswer` description.
 *
 * The `data` envelope is accepted as well as the bare body, since Laravel API
 * resources use it — the same tolerance the lesson response makes.
 *
 * **There is no `score` field, and none is invented here.** The contract has none
 * because an aggregate two repositories must agree on is a number that eventually
 * disagrees; the summary the reader shows is worked out from `perAnswer` at render
 * time instead. See `attempt/summarise-attempt.ts`.
 */

/** A quiz question answered by the option the learner chose. */
export const quizAnswerSchema = z.object({
  type: z.literal('quiz'),
  questionId: z.string().regex(/^q[0-9]+$/),
  optionId: z.string().regex(/^[a-z]$/),
})

/**
 * A recall prompt answered by the text the learner wrote. The text may be empty:
 * a learner who typed something and then deleted it has *touched* the prompt, and
 * the contract distinguishes that from a prompt they never reached, which is
 * omitted from the attempt altogether.
 */
export const recallAnswerSchema = z.object({
  type: z.literal('recall'),
  recallId: z.string().regex(/^rc[0-9]+$/),
  text: z.string(),
})

/**
 * A checklist step, ungraded telemetry. `done` is explicit for every step in the
 * lesson, including the ones the learner never touched, because a step that was
 * never opened and a step that was ticked and then unticked are different facts.
 */
export const stepsAnswerSchema = z.object({
  type: z.literal('steps'),
  stepId: z.string().regex(/^s[0-9]+$/),
  done: z.boolean(),
})

export const answerSchema = z.discriminatedUnion('type', [
  quizAnswerSchema,
  recallAnswerSchema,
  stepsAnswerSchema,
])

export type Answer = z.infer<typeof answerSchema>
export type QuizAnswer = z.infer<typeof quizAnswerSchema>
export type RecallAnswer = z.infer<typeof recallAnswerSchema>
export type StepsAnswer = z.infer<typeof stepsAnswerSchema>

export const attemptRequestSchema = z.object({
  answers: z.array(answerSchema),
})

export type AttemptRequest = z.infer<typeof attemptRequestSchema>

/**
 * What came back about one graded answer. `id` is the `questionId` or `recallId`
 * that was sent, named to match the request rather than as an opaque reference.
 *
 * `feedback` is a string, and for a recall it is the **only** channel the contract
 * gives for the expected answer and its rubric: the lesson response strips both and
 * `perAnswer` has nowhere else to carry them. So the backend writes them into these
 * words, and the reader labels them rather than splitting them apart by guessing.
 */
export const perAnswerSchema = z.object({
  type: z.enum(['quiz', 'recall']),
  id: z.string(),
  correct: z.boolean(),
  feedback: z.string(),
})

export type PerAnswer = z.infer<typeof perAnswerSchema>

/**
 * Evidence of understanding, offered rather than applied. `evidence` is required
 * because a candidate with no support for it is discarded by the backend, so a
 * candidate that arrived without one never meant anything.
 */
export const recordCandidateSchema = z.object({
  title: z.string(),
  body: z.string(),
  evidence: z.string(),
})

export type RecordCandidate = z.infer<typeof recordCandidateSchema>

/**
 * A term the learner's own words propose for the workspace glossary. `termId` is
 * present only when the candidate updates a term that already exists; a new term
 * has no id yet, so candidates carry the text.
 */
export const glossaryCandidateSchema = z.object({
  term: z.string(),
  learnerDefinition: z.string(),
  termId: z.number().int().optional(),
})

export type GlossaryCandidate = z.infer<typeof glossaryCandidateSchema>

const bareAttemptResultSchema = z.object({
  perAnswer: z.array(perAnswerSchema),
  // Null unless the answers show real understanding. The backend decides; see the
  // note above.
  recordCandidate: recordCandidateSchema.nullable().optional(),
  glossaryCandidates: z.array(glossaryCandidateSchema).optional(),
})

export const attemptResultSchema = bareAttemptResultSchema.or(
  z.object({ data: bareAttemptResultSchema }).transform((body) => body.data),
)

/**
 * Parses the response to a submitted attempt. Throwing here is deliberate: a result
 * the reader cannot read means the feedback for every graded answer is missing, and
 * that is a failed submission the learner is told about rather than an empty result
 * view pretending the attempt was graded.
 */
export function parseAttemptResult(raw: unknown) {
  return attemptResultSchema.parse(raw)
}

export type AttemptResult = ReturnType<typeof parseAttemptResult>
