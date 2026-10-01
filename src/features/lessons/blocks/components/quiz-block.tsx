import { useEffect, useId } from 'react'
import { Alert, Box, Paper, Radio, Stack, Text } from '@mantine/core'

import { useChooseQuizOption, useForgetQuizAnswers, useQuizAnswer } from '../../quiz/quiz-answers'
import type { QuizBlock } from '../../schemas/lesson-schema'
import { useLesson } from '../lesson-context'
import styles from './quiz-options.module.css'

/**
 * A run of questions with instant feedback, and the neutrality it is built around.
 *
 * The backend already made every option in a question the same length, so nothing
 * about how long an option is gives the answer away. **The renderer must not put a
 * clue back.** That is the whole constraint this component is shaped by:
 *
 * - every option is the same element, wrapped in the same label, carrying the same
 *   single class and no attribute of its own. There is nothing in the document that
 *   marks the right one, and nothing for a stylesheet to match on either;
 * - options are rendered in the order the lesson wrote them, and no order is
 *   derived from correctness;
 * - the feedback and the explanation are *absent* until the learner picks. Not
 *   hidden, not collapsed, not in a tooltip or a `title`: a feedback string in the
 *   document is an answer key the learner can read with the wrong settings.
 *
 * Picking is local to the learner: an answer can be changed for as long as the
 * lesson is on screen. Submission is not this block's job — a pick is reported to
 * `quiz/quiz-answers.ts`, which is where whoever sends the attempt reads it from.
 */
export function QuizBlockView({ block }: { block: QuizBlock }) {
  const { header } = useLesson()
  const forgetAnswers = useForgetQuizAnswers()

  useEffect(() => {
    // An attempt belongs to one visit of one lesson. Answers picked here do not
    // follow the learner off the page.
    return () => forgetAnswers(header.slug)
  }, [forgetAnswers, header.slug])

  return (
    <Stack gap="lg">
      {block.questions.map((question) => (
        <QuizQuestion key={question.id} question={question} lessonSlug={header.slug} />
      ))}
    </Stack>
  )
}

type QuizQuestionProps = {
  question: QuizBlock['questions'][number]
  lessonSlug: string
}

function QuizQuestion({ question, lessonSlug }: QuizQuestionProps) {
  const promptId = useId()
  // One name per question makes this a radio group of its own: the arrow keys
  // cannot walk out of it into the next question's answers, even where a lesson
  // has two quiz blocks and their question ids overlap.
  const groupName = useId()
  const picked = useQuizAnswer(lessonSlug, question.id)
  const choose = useChooseQuizOption()
  const pickedOption = question.options.find((option) => option.id === picked)

  return (
    <Box>
      <Text component="p" id={promptId} fw={600} mb="xs">
        {question.prompt}
      </Text>

      {/*
          A real radio group over real radio inputs, rather than a div with a click
          handler. The platform then gives the group what a group needs and this
          component does not have to reimplement: one tab stop per question, arrow
          keys moving and choosing within the question, and a checked state a
          screen reader reads as the answer rather than as a colour.
      */}
      <Stack gap="xs" role="radiogroup" aria-labelledby={promptId}>
        {question.options.map((option) => (
          // The label wraps the control and the words, so the whole row is the
          // target for a pointer, the hover rule has a row to paint, and the input
          // takes its accessible name from the words beside it.
          <Paper key={option.id} component="label" className={styles.option}>
            <Radio
              name={groupName}
              checked={picked === option.id}
              onChange={() => choose(lessonSlug, question.id, option.id)}
            />
            <Text component="span">{option.text}</Text>
          </Paper>
        ))}
      </Stack>

      <QuizFeedback promptId={promptId} question={question} option={pickedOption} />
    </Box>
  )
}

type QuizFeedbackProps = {
  /** The prompt this feedback belongs to, so the region is named after its question. */
  promptId: string
  question: QuizQuestionProps['question']
  /** The option the learner picked, or nothing while they have not picked one. */
  option: QuizQuestionProps['question']['options'][number] | undefined
}

/**
 * The feedback the option came with, then the question's explanation, in a live
 * region.
 *
 * The region is in the document before the learner answers and is empty until they
 * answer: a live region that arrives at the same moment as its own content is one
 * a screen reader may never register, and this feedback is the point of the block.
 * Empty, it announces nothing.
 *
 * It is named after the question it belongs to, so an announcement is "the question
 * you just answered, and here is where you landed" rather than an unlabelled status
 * from somewhere on the page.
 *
 * `role="note"` inside it rather than Mantine's default `alert`, because the live
 * region is already what announces this; an assertive alert as well would say it
 * twice.
 */
function QuizFeedback({ promptId, question, option }: QuizFeedbackProps) {
  if (!option) {
    return <Box role="status" aria-live="polite" aria-labelledby={promptId} />
  }

  const correct = option.id === question.correctOptionId
  const outcome = correct
    ? { label: 'Correct', marker: '✓', color: 'teal' }
    : { label: 'Not quite', marker: '✗', color: 'red' }

  return (
    <Box role="status" aria-live="polite" aria-labelledby={promptId} mt="sm">
      <Alert
        role="note"
        variant="light"
        color={outcome.color}
        radius="md"
        title={
          <Text component="span" fw={700} size="sm">
            {outcome.label}
          </Text>
        }
        icon={
          // The glyph is decoration: the word above already says it, and "check
          // mark" read out loud is noise. The word and the glyph and the colour
          // together, so none of them is the only carrier.
          <Text component="span" aria-hidden="true" fw={700}>
            {outcome.marker}
          </Text>
        }
      >
        <Text component="p" size="sm">
          {option.feedback}
        </Text>
        <Text component="p" size="sm" mt="xs">
          {question.explanation}
        </Text>
      </Alert>
    </Box>
  )
}
