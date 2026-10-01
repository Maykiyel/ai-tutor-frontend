import { useEffect, useId } from 'react'
import { Alert, Box, Button, Group, Stack, Text, Title } from '@mantine/core'
import { useMutation } from '@tanstack/react-query'

import { ErrorState } from '@/components/ui/error-state'

import { useLesson } from '../blocks/lesson-context'
import type { ParsedLessonBlock } from '../blocks/registry'
import { lessonMutations } from '../queries/lesson-mutations'
import type { RecordCandidate } from '../schemas/attempt-schema'
import { useForgetQuizAnswers, useLessonQuizAnswers } from '../quiz/quiz-answers'
import { useForgetRecallAnswers, useLessonRecallAnswers } from '../recall/recall-answers'
import { useForgetStepsProgress, useLessonStepsProgress } from '../steps/steps-progress'

import {
  useForgetSubmittedAttempt,
  useRecordSubmittedAttempt,
  useSubmittedAttempt,
} from '../attempt/attempt-store'
import type { SubmittedAttempt } from '../attempt/attempt-store'
import { buildAttempt, countGradedAnswers } from '../attempt/build-attempt'
import { summariseAttempt, summarySentence } from '../attempt/summarise-attempt'

/**
 * The one submit action, at the foot of one visit of one lesson.
 *
 * Everything the practice blocks kept is read here and gathered into a single
 * request by `buildAttempt`, which is the only place that knows what a practice
 * block is. That is why the reader frame can offer submission without learning
 * about quizzes, recalls and checklists one at a time: it hands down the parsed
 * blocks, and a new practice block is a new branch in the builder rather than a
 * change to this screen.
 *
 * Four states, and they are exclusive rather than layered:
 *
 * 1. **Nothing graded to send.** The action is present and disabled, with the reason
 *    spelled out beside it. An action that is simply missing leaves a learner
 *    wondering whether the page loaded; one that is disabled with no explanation is
 *    worse.
 * 2. **Ready.** One press sends one attempt.
 * 3. **Failed.** Reported, and nothing is cleared — a retry is one press and no
 *    retyping, which is the whole point of the answer stores outliving the failure.
 * 4. **Sent.** The attempt stays on screen and the answer stores are emptied.
 *
 * On success the stores *are* emptied, and the request that was sent is kept beside
 * the result instead. A sent attempt is a fact rather than scratch state, and it is
 * the only record of what the learner chose: clearing the maps without keeping this
 * would delete the evidence and leave a result nobody can read against anything.
 *
 * **This screen does not grade and does not decide that learning happened.** It
 * reports what came back. The summary is arithmetic over `perAnswer` and the record
 * note is the backend's own words. See `summarise-attempt.ts`.
 */
export function LessonSubmitPanel({
  lessonId,
  blocks,
}: {
  lessonId: string
  blocks: ParsedLessonBlock[]
}) {
  const { header } = useLesson()
  const slug = header.slug
  const reasonId = useId()

  const quizAnswers = useLessonQuizAnswers(slug)
  const recallAnswers = useLessonRecallAnswers(slug)
  const stepsProgress = useLessonStepsProgress(slug)

  const forgetQuizAnswers = useForgetQuizAnswers()
  const forgetRecallAnswers = useForgetRecallAnswers()
  const forgetStepsProgress = useForgetStepsProgress()
  const record = useRecordSubmittedAttempt()

  const submitted = useSubmittedAttempt(slug)
  const submit = useMutation(lessonMutations.submitAttempt())
  const forgetSubmitted = useForgetSubmittedAttempt()

  useEffect(() => {
    // An attempt belongs to one visit of one lesson, the same as the answers it was
    // built from: leaving the page and coming back starts a fresh visit rather than
    // showing a result for an attempt the learner can no longer see the answers to.
    // The blocks clear their own maps on unmount for the same reason.
    return () => forgetSubmitted(slug)
  }, [forgetSubmitted, slug])

  // Steps are deliberately not counted here. Ticking every box in a hands-on lesson
  // is not an answer, and the contract gives no step a `perAnswer` entry, so a
  // checklist on its own has nothing to send.
  const gradedAnswers = Object.keys(quizAnswers).length + Object.keys(recallAnswers).length
  const hasGradedBlock = blocks.some((parsed) => parsed.type === 'quiz' || parsed.type === 'recall')

  function send() {
    const attempt = buildAttempt({
      blocks,
      quizAnswers,
      recallAnswers,
      stepsProgress,
    })

    // `reset` before `mutate` so a second press after a failure does not carry the
    // first failure's message into the request it is about to send.
    submit.reset()
    submit.mutate(
      { lessonId, attempt },
      {
        onSuccess: (result) => {
          // Recorded before the maps are emptied, so there is no render in between
          // where the learner can watch their answers vanish without the result to
          // read them in.
          record(slug, attempt, result)
          forgetQuizAnswers(slug)
          forgetRecallAnswers(slug)
          forgetStepsProgress(slug)
        },
      },
    )
  }

  if (submitted) {
    return <AttemptResult submitted={submitted} blocks={blocks} />
  }

  return (
    <Stack component="section" gap="md">
      <Title order={2}>Send your answers</Title>

      {submit.isError ? (
        <ErrorState
          title="Your answers were not sent"
          message="Nothing was lost: everything you typed and picked is still here, and sending again costs you nothing. Try again."
          onRetry={send}
        />
      ) : null}

      <Group align="flex-start" justify="space-between" wrap="nowrap" gap="md">
        {/* `aria-describedby` rather than a tooltip: the reason has to be on the page
            for a learner who cannot hover, and a tooltip is not that. */}
        <Button
          onClick={send}
          loading={submit.isPending}
          disabled={gradedAnswers === 0}
          aria-describedby={gradedAnswers === 0 ? reasonId : undefined}
        >
          Send my answers
        </Button>

        {gradedAnswers === 0 ? <WhyNotSend id={reasonId} hasGradedBlock={hasGradedBlock} /> : null}
      </Group>
    </Stack>
  )
}

/**
 * Why the action is unavailable, in words, beside the action it explains.
 *
 * The steps case is stated outright because it is the one a learner gets wrong: a
 * ticked checklist feels like answering, and the contract grades no step at all. So
 * if ticking is the only thing blocking the button, that is what it says.
 */
function WhyNotSend({ id, hasGradedBlock }: { id: string; hasGradedBlock: boolean }) {
  return (
    <Text component="p" id={id} size="sm" c="dimmed">
      {hasGradedBlock
        ? 'Answer a question or write a prompt answer first. Ticking a step is not an answer: steps are not graded, so a checklist on its own cannot be sent.'
        : 'This lesson has no question and no prompt to answer, so there is nothing to send.'}
    </Text>
  )
}

/**
 * What came back, and it stays on screen for as long as the lesson is.
 *
 * Three things and no more: a summary worked out from `perAnswer`, one note per
 * graded answer, and a quiet line when the backend offered a learning record. Steps
 * are in none of them — the contract gives a step no `perAnswer` entry, so a ticked
 * box cannot contribute to anything this screen shows.
 */
function AttemptResult({
  submitted,
  blocks,
}: {
  submitted: SubmittedAttempt
  blocks: ParsedLessonBlock[]
}) {
  const summary = summariseAttempt(submitted.result.perAnswer, countGradedAnswers(blocks))

  return (
    <Stack component="section" gap="md">
      <Title order={2}>How your answers went</Title>

      {/*
          The one live region for the whole result, and it carries the sentence rather
          than the breakdown. An attempt arriving is an async event, and the learner
          pressed a button at the foot of a long lesson and has no other way of
          learning it went through; announcing two dozen words of per-answer feedback
          unprompted would be worse than not announcing it. The notes below are
          ordinary content the learner navigates to when they want it.
      */}
      <Box role="status" aria-live="polite">
        <Text>{summarySentence(summary)}</Text>
      </Box>

      <Text size="sm" c="dimmed">
        Your checklist is not in this count. Steps are not graded, so they contribute nothing to it.
      </Text>

      <Stack gap="sm">
        {submitted.result.perAnswer.map((entry) => (
          <PerAnswerNote
            key={`${entry.type}-${entry.id}`}
            entry={entry}
            answer={entry.type === 'quiz' ? submitted.quiz[entry.id] : submitted.recall[entry.id]}
            prompt={findPrompt(blocks, entry.type, entry.id)}
          />
        ))}
      </Stack>

      {submitted.result.recordCandidate ? (
        <RecordNote candidate={submitted.result.recordCandidate} />
      ) : null}
    </Stack>
  )
}

type PerAnswer = SubmittedAttempt['result']['perAnswer'][number]

/**
 * One graded answer, named by the question it belongs to, with what the learner gave
 * and what came back.
 *
 * The verdict is a word, a glyph and a colour, never a colour alone — the same three
 * channels the quiz block's instant feedback uses, so there is only one thing to
 * learn about what "right" looks like in this reader.
 *
 * The prompt is looked up in the lesson rather than sent back with the result. The
 * learner has just read it, and echoing it would mean a field two places have to
 * keep in step with the lesson.
 */
function PerAnswerNote({
  entry,
  answer,
  prompt,
}: {
  entry: PerAnswer
  answer: string | undefined
  prompt: string | undefined
}) {
  const outcome = entry.correct
    ? { label: 'Correct', marker: '✓', color: 'teal' }
    : { label: 'Not quite', marker: '✗', color: 'red' }

  return (
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
        <Text component="span" aria-hidden="true" fw={700}>
          {outcome.marker}
        </Text>
      }
    >
      <Stack gap="xs">
        {prompt ? (
          <Text component="p" fw={600}>
            {prompt}
          </Text>
        ) : null}

        <Text component="p" size="sm">
          <Text component="span" fw={500}>
            You {entry.type === 'quiz' ? 'chose' : 'wrote'}:{' '}
          </Text>
          {answer === undefined || answer === '' ? (
            <Text component="span" c="dimmed">
              nothing
            </Text>
          ) : (
            answer
          )}
        </Text>

        {/*
            For a recall these words are the expected answer and the rubric, and they
            are labelled as what they are. `feedback` is the only channel the contract
            gives them: the lesson response strips both, and `perAnswer` has no field
            for either. They arrive here and nowhere earlier, which is the whole
            reason the recall block can ask for an answer from memory.
        */}
        {entry.type === 'recall' ? (
          <Text component="p" size="sm" fw={500}>
            What a good answer says:
          </Text>
        ) : null}

        {entry.feedback.split('\n').map((line, index) => (
          <Text component="p" size="sm" key={index}>
            {line}
          </Text>
        ))}
      </Stack>
    </Alert>
  )
}

/**
 * The backend's own sentence, offered quietly.
 *
 * No celebration and no verdict of the reader's own: whether an attempt is evidence
 * of understanding is the backend's decision, and this screen reports it. Title,
 * body and evidence are all its words, so nothing here can overstate what it decided
 * or imply understanding that did not come back.
 *
 * When no candidate comes back there is no note at all, and no "not this time" in
 * its place. Telling a learner they were not understood is a judgement this screen
 * is not making either.
 */
function RecordNote({ candidate }: { candidate: RecordCandidate }) {
  return (
    <Alert
      role="note"
      variant="light"
      color="gray"
      radius="md"
      title="Kept as a record"
      icon={
        // A glyph rather than a colour: the title already says what happened, and
        // "pencil" read out loud is noise.
        <Text component="span" aria-hidden="true" fw={700}>
          ✎
        </Text>
      }
    >
      <Stack gap="xs">
        <Text component="p" size="sm" fw={500}>
          {candidate.title}
        </Text>
        <Text component="p" size="sm">
          {candidate.body}
        </Text>
        <Text component="p" size="sm" c="dimmed">
          Because: {candidate.evidence}
        </Text>
      </Stack>
    </Alert>
  )
}

/**
 * The prompt a graded answer belongs to, found in the lesson rather than sent with
 * the result.
 *
 * `undefined` when the lesson no longer has it — a lesson edited between the learner
 * reading it and the attempt coming back — and the note is then named by its verdict
 * alone rather than by a question the learner cannot find on the page.
 */
function findPrompt(
  blocks: ParsedLessonBlock[],
  type: 'quiz' | 'recall',
  id: string,
): string | undefined {
  for (const parsed of blocks) {
    if (type === 'quiz' && parsed.type === 'quiz') {
      const question = parsed.block.questions.find((candidate) => candidate.id === id)

      if (question) {
        return question.prompt
      }
    }

    if (type === 'recall' && parsed.type === 'recall' && parsed.block.id === id) {
      return parsed.block.prompt
    }
  }

  return undefined
}
