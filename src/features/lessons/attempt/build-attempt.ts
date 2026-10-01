import type { Answer, AttemptRequest } from '../schemas/attempt-schema'
import type { ParsedLessonBlock } from '../blocks/registry'
import type { QuizAnswerMap } from '../quiz/quiz-answers'
import type { RecallAnswerMap } from '../recall/recall-answers'
import type { StepsProgressMap } from '../steps/steps-progress'

/**
 * Turns one visit of one lesson into the one request the contract posts.
 *
 * This is the only place that knows what a practice block is. Each block keeps its
 * own answers where it can (see `quiz/quiz-answers.ts` and friends); this walks
 * the parsed blocks once to find out which ids exist, then reads the maps back. A
 * new practice block is a new branch here and a new map beside it, not a change to
 * the reader.
 *
 * The three lists follow three different rules, and the rules are the interesting
 * part:
 *
 * - **Quiz and recall: absence means skipped, so an absent entry is omitted.** The
 *   contract defines a missing answer as skipped and excluded from grading, and
 *   sending `{ questionId, optionId: '' }` instead would turn a skip into a blank
 *   answer the backend has to guess the meaning of. So the lesson decides which
 *   ids exist and the map decides which of them were touched.
 * - **A recall whose entry is empty is sent, as an empty string.** A learner who
 *   typed something and then deleted it has touched the prompt, and that is a
 *   different fact from never reaching it. The stores keep the two apart, so this
 *   must too.
 * - **Steps: every step in the lesson is sent, with an explicit `done`.** A step
 *   the learner never opened has no entry in the map at all, which is not the same
 *   as `false`, and a step they ticked and then unticked is `false` on purpose. The
 *   lesson's own step ids are the source of the list, not the map, so an untouched
 *   step is still reported rather than silently dropped.
 *
 * Order is the lesson's order, then the map within it, so two attempts at the same
 * lesson are the same request shape and a diff of two stored attempts is readable.
 */
export function buildAttempt({
  blocks,
  quizAnswers,
  recallAnswers,
  stepsProgress,
}: {
  blocks: ParsedLessonBlock[]
  quizAnswers: QuizAnswerMap
  recallAnswers: RecallAnswerMap
  stepsProgress: StepsProgressMap
}): AttemptRequest {
  const answers: Answer[] = []

  for (const parsed of blocks) {
    if (parsed.type === 'quiz') {
      for (const question of parsed.block.questions) {
        const optionId = quizAnswers[question.id]

        if (optionId !== undefined) {
          answers.push({ type: 'quiz', questionId: question.id, optionId })
        }
      }

      continue
    }

    if (parsed.type === 'recall') {
      const { id } = parsed.block

      // `hasOwn` rather than a truthiness test: an empty string is a real answer
      // here, and only a missing entry means skipped.
      if (Object.hasOwn(recallAnswers, id)) {
        answers.push({ type: 'recall', recallId: id, text: recallAnswers[id] })
      }

      continue
    }

    if (parsed.type === 'steps') {
      for (const item of parsed.block.items) {
        answers.push({
          type: 'steps',
          stepId: item.id,
          done: stepsProgress[item.id] ?? false,
        })
      }
    }
  }

  return { answers }
}

/**
 * How many answers in this lesson are graded at all: every quiz question and every
 * recall prompt, and never a step.
 *
 * The attempt result carries one `perAnswer` entry per graded answer, so the
 * difference between this and the entries that came back is the number of questions
 * the learner skipped — a number the result cannot report on its own, because a
 * skipped answer was never sent. It is the one piece of the summary that needs the
 * lesson rather than the response.
 */
export function countGradedAnswers(blocks: ParsedLessonBlock[]): number {
  return blocks.reduce((total, parsed) => {
    if (parsed.type === 'quiz') {
      return total + parsed.block.questions.length
    }

    if (parsed.type === 'recall') {
      return total + 1
    }

    return total
  }, 0)
}
