import { Title } from '@mantine/core'

import type { HeadingBlock } from '../../schemas/lesson-schema'

/**
 * A real heading, so the lesson has a structure a screen reader and a keyboard
 * user can follow. `level` is 2 or 3 by contract, so the levels nest under the
 * lesson title as h1 rather than skipping a level.
 */
export function HeadingBlockView({ block }: { block: HeadingBlock }) {
  return <Title order={block.level}>{block.text}</Title>
}
