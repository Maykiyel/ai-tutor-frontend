import { Text } from '@mantine/core'

import { useAttemptSent } from './attempt-store'

/**
 * The line a practice block shows once the attempt has been sent.
 *
 * Locking a control silently is the failure mode this exists to avoid: a learner
 * who taps a radio and nothing happens, or finds a text area greyed out for reasons
 * nobody states, concludes the app has broken rather than that their answers are
 * already with the backend. So every block that locks says so in words, right beside
 * the control that stopped responding, and the sentence is the same in all three so
 * there is only one thing to learn.
 *
 * The slug is a prop rather than read from the lesson context because each block
 * already has it and passes it to its own store hooks; the component is deliberately
 * not a context reader so it can never be used somewhere there is no lesson around it.
 */
export function LockedAnswersNote({ lessonSlug }: { lessonSlug: string }) {
  const sent = useAttemptSent(lessonSlug)

  if (!sent) {
    return null
  }

  return (
    <Text size="sm" c="dimmed">
      Sent. Your answers are locked, and they stay on screen with the result.
    </Text>
  )
}
