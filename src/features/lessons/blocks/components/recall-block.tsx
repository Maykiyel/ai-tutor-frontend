import { useEffect } from 'react'
import { Stack, Text, Textarea, Title } from '@mantine/core'

import { useSubmittedAttempt } from '../../attempt/attempt-store'
import { LockedAnswersNote } from '../../attempt/locked-answers-note'
import type { RecallBlock } from '../../schemas/lesson-schema'
import {
  useForgetRecallAnswers,
  useRecallAnswer,
  useWriteRecallAnswer,
} from '../../recall/recall-answers'
import { useLesson } from '../lesson-context'

/**
 * A prompt the learner answers from memory, in a text area they can keep typing
 * into, and the neutrality it is built around.
 *
 * The expected answer and the rubric are **not in the block, not in the lesson
 * response, and not anywhere on this screen**. The contract stores both with the
 * lesson and strips them before the response leaves the backend, so a renderer
 * cannot leak what it was never given. They come back in the attempt result,
 * after the learner has submitted — which is what makes the prompt worth
 * answering from memory rather than worth reading back.
 *
 * The text area is labelled by the prompt itself rather than by a word like
 * "Answer", so the control is named by the question it is for: two prompts in one
 * lesson are two distinguishable controls, not two boxes called "Answer".
 *
 * What the learner types is kept outside the block, so reading further down the
 * lesson and coming back does not cost them the sentence.
 */
export function RecallBlockView({ block }: { block: RecallBlock }) {
  const { header } = useLesson()
  const typed = useRecallAnswer(header.slug, block.id)
  const write = useWriteRecallAnswer()
  const forget = useForgetRecallAnswers()
  // Sending the attempt empties the live answer map, so what the learner wrote is
  // read back off the request that carried it. Read-only rather than blank: an
  // answer they cannot change and cannot see is an answer they have to trust.
  const sent = useSubmittedAttempt(header.slug)
  const answer = sent ? (sent.recall[block.id] ?? '') : typed

  useEffect(() => {
    // An attempt belongs to one visit of one lesson. An answer written here does
    // not follow the learner off the page. `forget` is selected straight off the
    // store, so its identity is fixed and this effect runs once on mount and once
    // on unmount — not once per render, which would delete the sentence under the
    // learner's cursor as they type it.
    return () => forget(header.slug)
  }, [forget, header.slug])

  return (
    <Stack gap="xs">
      <Title order={3}>From memory</Title>

      <Textarea
        label={block.prompt}
        value={answer}
        onChange={(event) => write(header.slug, block.id, event.currentTarget.value)}
        readOnly={Boolean(sent)}
        // Not autosized: the autosizing variant measures itself against a live
        // DOM it does not get under a test renderer, and a recall answer has to
        // be typable there for the tests to mean anything. A plain area the
        // learner can drag taller is enough for a paragraph or two of prose.
        rows={4}
        placeholder="Write it in your own words."
      />

      {/* Said as words rather than left to be inferred from an empty field: an
          answer nobody has read yet is not a mistake, and a learner should not
          have to wonder whether the box swallowed what they typed. */}
      <Text size="sm" c="dimmed">
        {!answer.trim()
          ? 'Not written yet.'
          : sent
            ? 'Sent with your attempt.'
            : 'Written down. You can change it for as long as the lesson is open.'}
      </Text>

      <LockedAnswersNote lessonSlug={header.slug} />
    </Stack>
  )
}
