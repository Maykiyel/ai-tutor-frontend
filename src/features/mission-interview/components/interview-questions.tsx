import { Text } from '@mantine/core'

import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoices,
  QuestionnaireDescription,
  QuestionnaireError,
  QuestionnaireInput,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireProgress,
  QuestionnaireSkip,
  QuestionnaireSubmit,
  QuestionnaireTitle,
  type QuestionnaireAnswers,
} from '@/components/ui/questionnaire/questionnaire'

import type { InterviewQuestion } from '../schemas/interview-schema'

type InterviewQuestionsProps = {
  questions: InterviewQuestion[]
  onSubmit: (answers: QuestionnaireAnswers) => void
  pending: boolean
  submitLabel?: string
  /** A line under a question's title, by question id. */
  descriptions?: Record<string, string>
}

/**
 * One turn's questions, asked through the questionnaire.
 *
 * The tutor decides the shape of each question. A choice question keeps a
 * written answer beside its choices, because the tutor offers choices only where
 * they help and the learner's real answer may be none of them. An open question
 * is the written answer alone.
 *
 * Every label here is model output and is rendered as text, never as markup
 * (ADR-0001).
 */
export function InterviewQuestions({
  questions,
  onSubmit,
  pending,
  submitLabel = 'Send answers',
  descriptions = {},
}: InterviewQuestionsProps) {
  return (
    <Questionnaire
      items={questions.map((question) => ({ name: question.id, required: question.required }))}
      onSubmit={onSubmit}
      disabled={pending}
      aria-label="The tutor's questions"
    >
      {questions.length > 1 ? <QuestionnaireProgress /> : null}

      {questions.map((question) => (
        <QuestionnaireItem
          key={question.id}
          name={question.id}
          multiple={question.type === 'multi'}
        >
          <QuestionnaireTitle>{question.label}</QuestionnaireTitle>
          {descriptions[question.id] ? (
            <QuestionnaireDescription>{descriptions[question.id]}</QuestionnaireDescription>
          ) : question.type === 'multi' ? (
            <QuestionnaireDescription>Pick any that apply.</QuestionnaireDescription>
          ) : null}

          <QuestionnaireChoices>
            {question.options.map((option) => (
              <QuestionnaireChoice key={option.value} value={option.value}>
                <Text component="span">{option.label}</Text>
              </QuestionnaireChoice>
            ))}
            <QuestionnaireInput
              label={question.type === 'open' ? 'Your answer' : 'Or in your own words'}
            />
          </QuestionnaireChoices>

          <QuestionnaireError />
        </QuestionnaireItem>
      ))}

      <QuestionnaireActions>
        <QuestionnairePrevious />
        <QuestionnaireSkip />
        <QuestionnaireNext />
        <QuestionnaireSubmit loading={pending}>{submitLabel}</QuestionnaireSubmit>
      </QuestionnaireActions>
    </Questionnaire>
  )
}
