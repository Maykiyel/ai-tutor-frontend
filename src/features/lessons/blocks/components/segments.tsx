import { useId, useState } from 'react'
import { Anchor, Code, Popover, Stack, Text } from '@mantine/core'
import { Link, useParams } from 'react-router'

import { paths } from '@/config/paths'

import { externalLinkAttributes, followableUrl } from '../../lib/source-url'
import { useLesson } from '../lesson-context'
import type { HydratedResource, HydratedTerm, Segment } from '../../schemas/lesson-schema'

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
 * Each of the five segment types has a case below and nothing above needs to
 * change: a `term` resolves against the hydrated terms map, a `cite` against the
 * hydrated resources map, and a `link` against the current workspace. All three
 * come from `LessonContext` rather than from a wider prop, so a block component
 * still takes `{ block }` and nothing else. **No segment ever makes a request**:
 * the ids in the payload point at records the response already carries, and an id
 * it does not carry degrades to the words the lesson wrote instead.
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
  const { terms, resources } = useLesson()

  switch (segment.type) {
    case 'text':
      return segment.text

    // Inline code carries no language on purpose: the `code` block has one where
    // it matters, and a language hint on a one-word identifier has no use.
    case 'code':
      return <Code>{segment.text}</Code>

    case 'term':
      return <TermSegment segment={segment} term={terms[String(segment.termId)]} />

    case 'cite':
      return <CiteSegment segment={segment} resource={resources[String(segment.resourceId)]} />

    case 'link':
      return <LinkSegment segment={segment} />

    // Deliberately no `default`. The union has five members and all five are
    // handled above, so a sixth segment type is a typecheck error here rather
    // than a segment that silently reads as plain text. What *degrades* to plain
    // text is a segment whose id the response does not carry, which each case
    // below decides for itself.
  }
}

/**
 * A glossary term, and the definition the learner can ask for without losing
 * their place.
 *
 * The card opens on hover **and** on focus, because a definition that only a
 * mouse can reach is a definition half the learners never see. It is a button so
 * that focus lands on it while tabbing through the lesson and so that
 * `aria-expanded` has something to describe; the surrounding prose reads exactly
 * as it did before the term became interactive.
 *
 * The card is for the eye. A screen reader stays on the button when the card
 * opens and never visits a popover it was not sent into, so the definition also
 * reaches the ear as the button's description, from a copy that is `hidden`: it
 * is read when the term is focused and skipped when the sentence is read through.
 *
 * Escape closes the card and leaves focus on the term. Content that appears on
 * focus has to be dismissible without moving focus, or a learner who wants the
 * card out of the way has to leave the sentence they are reading to get rid of it.
 */
function TermSegment({
  segment,
  term,
}: {
  segment: Extract<Segment, { type: 'term' }>
  term: HydratedTerm | undefined
}) {
  const [pointed, setPointed] = useState(false)
  const [focused, setFocused] = useState(false)
  // Escape wins until the learner points or focuses again, so a dismissed card
  // does not reopen under a pointer or a focus that never left.
  const [dismissed, setDismissed] = useState(false)
  const definitionId = useId()

  if (!term) {
    return reportMissingTerm(segment.termId, segment.text)
  }

  const open = (pointed || focused) && !dismissed

  return (
    <>
      <Popover
        opened={open}
        onChange={setPointed}
        position="top"
        withArrow
        arrowSize={6}
        arrowOffset={4}
        shadow="md"
        radius="md"
        width={280}
        // The card holds no controls, so focus never needs to move into it and
        // leaving the term closes the card whether the pointer or the keyboard
        // moved.
        trapFocus={false}
        closeOnEscape
      >
        <Popover.Target>
          <Anchor
            component="button"
            type="button"
            underline="always"
            fw={500}
            aria-describedby={definitionId}
            onMouseEnter={() => {
              setDismissed(false)
              setPointed(true)
            }}
            onMouseLeave={() => setPointed(false)}
            onFocus={() => {
              setDismissed(false)
              setFocused(true)
            }}
            onBlur={() => setFocused(false)}
            onKeyDown={(event) => {
              if (event.key === 'Escape' && open) {
                event.stopPropagation()
                setDismissed(true)
              }
            }}
          >
            {segment.text}
          </Anchor>
        </Popover.Target>

        <Popover.Dropdown>
          <Stack gap={4}>
            <Text component="p" size="sm">
              {term.definition}
            </Text>

            {term.avoid && term.avoid.length > 0 ? (
              <Text component="p" size="xs" c="dimmed">
                {/* The aliases travel with the definition so the learner keeps one
                  word per idea without having to remember which word the
                  lessons chose. */}
                Avoid: {term.avoid.join(', ')}
              </Text>
            ) : null}
          </Stack>
        </Popover.Dropdown>
      </Popover>

      <span id={definitionId} hidden>
        {term.definition}
      </span>
    </>
  )
}

/**
 * A citation, linked to the source behind the claim.
 *
 * A source is somebody else's page: it opens in a new tab and carries
 * `noopener noreferrer`, so it cannot reach back through `window.opener` into the
 * app. A url the payload writes that is not http or https is not followed at all,
 * because a source that arrives with a `javascript:` url is exactly the case
 * ADR-0001 exists for.
 */
function CiteSegment({
  segment,
  resource,
}: {
  segment: Extract<Segment, { type: 'cite' }>
  resource: HydratedResource | undefined
}) {
  const url = resource && followableUrl(resource.url)

  if (!url) {
    return segment.text
  }

  return (
    <Anchor href={url} {...externalLinkAttributes}>
      {segment.text}
    </Anchor>
  )
}

/**
 * A cross-reference to another lesson, or to a reference doc in the same
 * workspace. It is a router link, so the app's own navigation handles it.
 *
 * A target the app cannot resolve reads as plain words. A link that goes nowhere
 * is worse than no link: the learner is sent away from a lesson they were reading
 * and lands on nothing.
 */
function LinkSegment({ segment }: { segment: Extract<Segment, { type: 'link' }> }) {
  const { workspaceId = '' } = useParams()
  const href = crossReferenceHref(segment.to, segment.targetId, workspaceId)

  if (!href) {
    return segment.text
  }

  return (
    <Anchor component={Link} to={href}>
      {segment.text}
    </Anchor>
  )
}

function crossReferenceHref(
  to: Extract<Segment, { type: 'link' }>['to'],
  targetId: number,
  workspaceId: string,
): string | null {
  // Ids in the payload are ids of records in this workspace, so an id no record
  // can have names nothing, and a cross-reference with no workspace has nowhere
  // to point. Both are plain text rather than a link to a dead end.
  if (!workspaceId || !Number.isInteger(targetId) || targetId < 1) {
    return null
  }

  const target = String(targetId)

  return to === 'lesson'
    ? paths.workspaces.lessonDetail.getHref(workspaceId, target)
    : paths.workspaces.referenceDocDetail.getHref(workspaceId, target)
}

/**
 * A term id the response does not carry is a fact about the response, not a
 * broken lesson, so the words stay and the id is logged for whoever reads the
 * console. Logged once per id: a lesson with the same missing term forty times
 * is one backend bug.
 */
const reportedTermIds = new Set<number>()

function reportMissingTerm(termId: number, text: string): string {
  if (!reportedTermIds.has(termId)) {
    reportedTermIds.add(termId)
    console.warn(
      `[lesson-reader] lesson cites glossary term ${termId} ("${text}"), which this response ` +
        'does not carry. Rendered the words as plain text.',
    )
  }

  return text
}
