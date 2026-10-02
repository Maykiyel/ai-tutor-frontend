import type { QuestionnaireAnswers } from '@/components/ui/questionnaire/questionnaire'

import type { InterviewQuestion } from '../schemas/interview-schema'

/** One question as the learner saw it, beside what they answered, in words. */
export type AnsweredQuestion = {
  question: string
  answer: string
}

/**
 * Puts the learner's answers back into words, in the order the tutor asked.
 *
 * Choices go back as their labels, not their values: the tutor wrote the labels
 * and reads words, and the value is only an id the questionnaire needed. A
 * written answer beside a choice goes too, after it. An explicit skip is said as
 * a skip, so the tutor does not ask again in the same breath; a question left
 * blank (only possible for an optional one) is said as unanswered.
 */
export function describeAnswers(
  questions: InterviewQuestion[],
  answers: QuestionnaireAnswers,
): AnsweredQuestion[] {
  return questions.map((question) => {
    const answer = answers[question.id]

    if (!answer || answer.skipped) {
      return { question: question.label, answer: 'Skipped.' }
    }

    const parts = answer.choices.map(
      (value) => question.options.find((option) => option.value === value)?.label ?? value,
    )
    const written = answer.text.trim()

    if (written) {
      parts.push(written)
    }

    return {
      question: question.label,
      answer: parts.length > 0 ? parts.join('; ') : 'No answer.',
    }
  })
}

/**
 * The prompt the tutor receives: each question, then its answer, one pair to a
 * paragraph. Plain text, because the tutor is told to interview in natural
 * language and the backend sends this to it as the learner's message.
 */
export function toPrompt(answered: AnsweredQuestion[]): string {
  return answered.map(({ question, answer }) => `${question}\n${answer}`).join('\n\n')
}
