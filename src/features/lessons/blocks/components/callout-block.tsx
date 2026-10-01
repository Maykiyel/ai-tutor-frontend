import { Alert, Text } from '@mantine/core'

import type { CalloutBlock, CalloutTone } from '../../schemas/lesson-schema'
import { SegmentContent } from './segments'

/**
 * The three tones in words, plus a shape. A learner must be able to tell a win
 * from a warning in any colour scheme, and a learner who cannot distinguish
 * colours at all must be able to do it too, so the tone is carried three ways:
 * the word, the marker glyph, and the colour.
 */
const tonePresentation: Record<CalloutTone, { label: string; marker: string; color: string }> = {
  win: { label: 'Win', marker: '✓', color: 'lime' },
  note: { label: 'Note', marker: 'i', color: 'blue' },
  'watch-out': { label: 'Watch out', marker: '!', color: 'orange' },
}

/**
 * `role="note"` rather than Mantine's default `alert`: a callout is part of the
 * lesson's prose, not an event, and an assertive live region would announce
 * every one of them the moment the lesson loads.
 */
export function CalloutBlockView({ block }: { block: CalloutBlock }) {
  const { label, marker, color } = tonePresentation[block.tone]

  return (
    <Alert
      role="note"
      variant="light"
      color={color}
      radius="md"
      title={
        <Text component="span" fw={700} size="sm">
          {label}
        </Text>
      }
      icon={
        // The glyph is decorative: the tone is already the accessible name, so
        // announcing "check mark" as well would be noise.
        <Text component="span" aria-hidden="true" fw={700}>
          {marker}
        </Text>
      }
    >
      <Text component="p">
        <SegmentContent segments={block.content} />
      </Text>
    </Alert>
  )
}
