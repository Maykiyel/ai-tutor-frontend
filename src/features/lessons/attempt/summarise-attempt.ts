import type { PerAnswer } from '../schemas/attempt-schema'

export type AttemptSummary = {
  /** How many graded answers came back with a result. */
  answered: number
  /** How many of those were right. */
  correct: number
  /** Graded answers the learner skipped, so never sent and never graded. */
  skipped: number
}

/**
 * The summary the reader shows, worked out here rather than sent.
 *
 * `docs/lesson-schema.json` fixes `perAnswer` and deliberately has no `score`
 * field: an aggregate two repositories have to agree on is a number that
 * eventually disagrees, and this is the number. Working it out in one place from
 * what came back keeps the arithmetic honest about its own inputs — the counts
 * below *are* the per-answer results, and the reader cannot claim a grade the
 * backend did not send.
 *
 * Three consequences worth stating, because each is a decision rather than an
 * accident:
 *
 * - **Steps contribute nothing.** A ticked step is ungraded telemetry: the contract
 *   gives it no `perAnswer` entry, so it cannot appear in a count of graded answers
 *   even if a learner ticked every box.
 * - **A skipped answer is not a wrong answer.** The summary counts what came back,
 *   and reports the difference between that and what the lesson asked as skipped,
 *   because a skip was never sent and grading it as a miss would be inventing a
 *   result nobody produced.
 * - **The right count is over answered questions, not over the lesson.** The
 *   `answered` total is the denominator, so a learner who answered one question
 *   correctly out of the one they attempted is told exactly that, rather than being
 *   placed against five they never got to.
 *
 * `gradedInLesson` is the count of graded items the lesson contains, which only
 * the lesson knows: a skipped answer left no trace in the response.
 */
export function summariseAttempt(perAnswer: PerAnswer[], gradedInLesson: number): AttemptSummary {
  const answered = perAnswer.length
  const correct = perAnswer.filter((entry) => entry.correct).length

  return {
    answered,
    correct,
    // A lesson may hold graded items whose ids never reached the response at all,
    // so the difference is clamped rather than allowed to go negative.
    skipped: Math.max(gradedInLesson - answered, 0),
  }
}

/**
 * The summary as a sentence, because the learner reads it rather than computes it.
 *
 * A question is a question and a prompt is a prompt, so the noun agrees with the
 * number; two graded answers are "answers" and one is a "question". No percentage
 * and no grade: this is the shape of the attempt, not a verdict on it.
 */
export function summarySentence({ answered, correct, skipped }: AttemptSummary): string {
  if (answered === 0) {
    return 'No graded answers came back with this attempt.'
  }

  // Phrased around the count of answers rather than around a percentage, so the noun
  // agrees in every case including one of one.
  const sentences = [`${correct} of ${answered} ${answered === 1 ? 'answer' : 'answers'} right.`]

  if (skipped > 0) {
    sentences.push(
      `${skipped} ${skipped === 1 ? 'answer was' : 'answers were'} skipped, and a skipped answer is not graded.`,
    )
  }

  return sentences.join(' ')
}
