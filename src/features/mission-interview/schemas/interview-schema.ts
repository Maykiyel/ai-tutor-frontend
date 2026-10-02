import { z } from 'zod'

/**
 * One turn of the mission interview: what the tutor said, the questions it asked
 * in a form the questionnaire can render, the mission as it stands so far, and
 * whether the interview is over.
 *
 * There is no shared contract for this response. The agreed endpoint,
 * `POST /api/workspaces/{id}/mission-interview/messages`, is not built, so the
 * shape below follows the local-only practice route `POST /api/test-teach` in
 * the backend (`routes/api.php`) and the output contract its agent is prompted
 * with (`app/Ai/Agents/TestTeachAgent.php`). It is a known gap, not an
 * agreement, for the same reasons `mission-schema.ts` gives.
 *
 * Everything the model writes is parsed leniently, one piece at a time. The
 * questions and the mission draft are model output relayed by the backend with
 * no validation of their own, so a malformed question is dropped rather than
 * failing the turn, and a missing draft field reads as not known yet. What must
 * hold for a turn to be usable at all — a conversation id and something the
 * tutor said — is strict.
 */

const optionSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
})

/** Keeps the entries that parse and drops the rest, rather than failing the list. */
function lenientArray<T>(schema: z.ZodType<T>) {
  return z
    .array(z.unknown())
    .catch([])
    .transform((entries) =>
      entries.flatMap((entry) => {
        const parsed = schema.safeParse(entry)

        return parsed.success ? [parsed.data] : []
      }),
    )
}

const questionSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    type: z.enum(['open', 'single', 'multi']).catch('open'),
    options: lenientArray(optionSchema),
    required: z.boolean().catch(false),
  })
  .transform((question) => {
    // A choice question with nothing left to choose from can still be answered in
    // words, so it becomes an open one rather than a question with no answers.
    const type = question.options.length === 0 ? 'open' : question.type
    const seen = new Set<string>()
    const options = question.options.filter((option) => {
      const duplicate = seen.has(option.value)
      seen.add(option.value)

      return !duplicate
    })

    return { ...question, type, options: type === 'open' ? [] : options }
  })

const textListSchema = lenientArray(z.string().trim().min(1))

const missionDraftSchema = z.object({
  topic: z.string().nullable().catch(null),
  why: z.string().trim().min(1).nullable().catch(null),
  success: textListSchema,
  constraints: textListSchema,
  out_of_scope: textListSchema,
})

const turnSchema = z
  .object({
    conversation_id: z.string().min(1),
    reply: z.string(),
    phase: z.string().nullable().catch(null),
    questions: lenientArray(questionSchema),
    structured: z
      .object({ mission_draft: missionDraftSchema.nullable().catch(null) })
      .nullable()
      .catch(null),
  })
  .transform((turn) => {
    const ids = new Set<string>()
    // Question ids name the questionnaire's items, so two questions sharing one
    // would answer each other. The first keeps the id; the rest are dropped.
    const questions = turn.questions.filter((question) => {
      const duplicate = ids.has(question.id)
      ids.add(question.id)

      return !duplicate
    })
    const draft = turn.structured?.mission_draft ?? null

    return {
      conversationId: turn.conversation_id,
      message: turn.reply,
      // The practice route moves straight on to teaching once the mission is
      // captured, so its `lesson` phase is this screen's "the interview is
      // over". The lesson it carries is not read: lessons are asked for once the
      // mission is saved, not here. Any phase this screen does not know keeps
      // the interview going, which is the safe way to be wrong.
      status: turn.phase === 'lesson' ? ('complete' as const) : ('interviewing' as const),
      questions,
      missionDraft: draft
        ? {
            why: draft.why,
            success: draft.success,
            constraints: draft.constraints,
            outOfScope: draft.out_of_scope,
          }
        : null,
    }
  })

/** The Laravel `data` envelope and a bare body are both accepted, as elsewhere. */
export const interviewTurnResponseSchema = z.union([
  z.object({ data: turnSchema }).transform((body) => body.data),
  turnSchema,
])

export type InterviewTurn = z.infer<typeof interviewTurnResponseSchema>
export type InterviewQuestion = InterviewTurn['questions'][number]
export type MissionDraft = NonNullable<InterviewTurn['missionDraft']>
