import { Code } from '@mantine/core'

import type { Segment } from '../../schemas/lesson-schema'

/**
 * The one place inline content inside a paragraph or callout becomes React.
 *
 * Segments are rendered as text nodes, never as HTML. Lesson JSON is model
 * output from web search results, which are untrusted, so nothing here may
 * become markup. See ADR-0001.
 *
 * Renders into whatever text element the caller already provides, so a paragraph
 * or callout keeps one typographic context rather than nesting one per segment.
 *
 * Scope note for the segment ticket that follows: this renders `text` and inline
 * `code`, and degrades the remaining three segment types to their `text`, which
 * is exactly the fallback the spec requires for a segment the app cannot resolve.
 * Extending it to term hover cards, citation links, and cross-reference links
 * means adding a case per segment type here and nothing above it.
 */
export function SegmentContent({ segments }: { segments: Segment[] }) {
  return (
    <>
      {segments.map((segment, index) => (
        <SegmentText key={index} segment={segment} />
      ))}
    </>
  )
}

function SegmentText({ segment }: { segment: Segment }) {
  switch (segment.type) {
    case 'text':
      return segment.text

    // Inline code carries no language on purpose: the `code` block has one where
    // it matters, and a language hint on a one-word identifier has no use.
    case 'code':
      return <Code>{segment.text}</Code>

    // A term, a citation, and a cross-reference all carry the words the lesson
    // chose to put there. Rendering those words is correct on its own, so a
    // segment the app cannot resolve still leaves a readable sentence.
    default:
      return segment.text
  }
}
