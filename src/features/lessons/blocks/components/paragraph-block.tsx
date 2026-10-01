import { Text } from '@mantine/core'

import type { ParagraphBlock } from '../../schemas/lesson-schema'
import { SegmentContent } from './segments'

export function ParagraphBlockView({ block }: { block: ParagraphBlock }) {
  return (
    <Text component="p">
      <SegmentContent segments={block.content} />
    </Text>
  )
}
