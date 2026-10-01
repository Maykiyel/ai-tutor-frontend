import { Box, Code, ScrollArea, Text } from '@mantine/core'

import type { CodeBlock } from '../../schemas/lesson-schema'
import styles from './code-block.module.css'

/**
 * Code is rendered as **inert text**. It is never passed to a syntax highlighter
 * that evaluates its input and never used to build markup, because lesson JSON
 * is model output and a highlighter is an execution surface. See ADR-0001.
 *
 * `scrollbarSize` is raised and the scrollbar is always visible because a reader
 * who cannot see that a line continues past the edge has no way to know to
 * scroll. The block scrolls sideways inside its own box, so a long line never
 * widens the page.
 *
 * The surface and the label come from `code-block.module.css` rather than Mantine
 * defaults, because Mantine's default code surface is a 1.04:1 difference from this
 * app's page — the code was legible but did not read as a block. See that file for
 * the measurements.
 */
export function CodeBlockView({ block }: { block: CodeBlock }) {
  return (
    <Box>
      <Text size="xs" fw={700} tt="uppercase" className={styles.label} mb={4}>
        {block.language}
      </Text>

      <ScrollArea type="auto" scrollbars="x" offsetScrollbars scrollbarSize={12}>
        <Code block fz="sm" className={styles.surface}>
          {block.code}
        </Code>
      </ScrollArea>
    </Box>
  )
}
