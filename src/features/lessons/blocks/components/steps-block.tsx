import { useEffect, useId } from 'react'
import { Checkbox, Paper, Stack, Text, Title } from '@mantine/core'

import type { StepsBlock } from '../../schemas/lesson-schema'
import { useForgetStepsProgress, useSetStepDone, useStepDone } from '../../steps/steps-progress'
import { useLesson } from '../lesson-context'
import styles from './steps-list.module.css'

/**
 * A hands-on lesson as the checklist it is: a title, one row per step, and beside
 * each step the sentence that tells the learner how they will know it is done.
 *
 * A step with no check is a step the learner cannot tell they have finished, so
 * every row carries one, written out in the open rather than hidden behind a
 * control the learner has to find.
 *
 * Each row is a real `<label>` around a real checkbox, which is what makes the
 * whole row a pointer target and gives the platform what a checkbox needs: Space
 * to toggle, checkedness as the answer state, and a name a screen reader reads
 * out. The instruction is the control's accessible name on purpose — the check is
 * supporting material beside the step, not part of what the step is called — so
 * the label element names the row and `aria-label` names the control.
 *
 * Ticking is never carried by colour. A tick shows as the checkbox's own
 * checkedness, the instruction struck through, and the word "Done", so a learner
 * who perceives none of the three still knows where they are in the list.
 *
 * Where the learner is in the list is kept outside the block, so reading further
 * down the lesson and coming back does not untick the work already done.
 */
export function StepsBlockView({ block }: { block: StepsBlock }) {
  const { header } = useLesson()
  const titleId = useId()
  const forget = useForgetStepsProgress()

  useEffect(() => {
    // Progress belongs to one visit of one lesson: it does not follow the learner
    // off the page. `forget` is selected straight off the store, so its identity
    // is fixed and this effect runs once on mount and once on unmount — not once
    // per render, which would untick the whole list under the learner while they
    // worked down it.
    return () => forget(header.slug)
  }, [forget, header.slug])

  return (
    // A section named by its own title rather than a bare list, so a screen
    // reader says which checklist a step belongs to when the learner tabs in.
    <Stack component="section" gap="sm" aria-labelledby={titleId}>
      <Title order={3} id={titleId}>
        {block.title}
      </Title>

      <Stack gap="sm" role="group" aria-labelledby={titleId}>
        {block.items.map((item) => (
          <StepRow key={item.id} item={item} lessonSlug={header.slug} />
        ))}
      </Stack>
    </Stack>
  )
}

function StepRow({ item, lessonSlug }: { item: StepsBlock['items'][number]; lessonSlug: string }) {
  const done = useStepDone(lessonSlug, item.id)
  const setDone = useSetStepDone()

  return (
    // The label wraps the control and the words, so the whole row is the target
    // for a pointer, the hover rule has a row to paint, and clicking anywhere in
    // it toggles the step with no click handler anywhere in this component.
    <Paper component="label" className={styles.step}>
      <Checkbox
        checked={done}
        onChange={() => setDone(lessonSlug, item.id, !done)}
        aria-label={item.instruction}
      />

      <Stack gap={2}>
        <Text component="span" fw={500} td={done ? 'line-through' : undefined}>
          {item.instruction}
        </Text>

        {/* Dimmed rather than hidden, because a hint the learner has to go looking
            for is a hint most of them never read. */}
        <Text component="span" size="sm" c="dimmed">
          You know it is done when: {item.check}
        </Text>

        {/* Words as well as a tick and a struck-through line, so nothing in this
            row is signalled by colour alone. */}
        {done ? (
          <Text component="span" size="sm" fw={500}>
            Done
          </Text>
        ) : null}
      </Stack>
    </Paper>
  )
}
