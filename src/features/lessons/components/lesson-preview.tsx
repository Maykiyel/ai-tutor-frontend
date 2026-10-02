import { Alert, Button, Group, Stack, Text, Title } from '@mantine/core'
import { useId } from 'react'

import { LessonProvider } from '../blocks/lesson-context'
import { parseLessonBlocks } from '../blocks/parse-blocks'
import {
  lessonResponseSchema,
  SUPPORTED_SCHEMA_VERSION,
  type ParsedLessonResponse,
} from '../schemas/lesson-schema'
import { LessonHeaderView } from './lesson-header'
import { LessonBlocks, NewerVersionNotice, SkippedBlocksNotice } from './lesson-reader'
import { LessonSourceList } from './lesson-source-list'

/**
 * The raw lesson payload of a completed interview turn, exactly as the
 * interview schema carries it: unvalidated, because validating it is this
 * component's job, not the interview's.
 */
export type InterviewLessonPayload = {
  lesson: unknown
  terms: unknown
  resources: unknown
}

/**
 * A generated lesson before it is saved: the same blocks the reader renders,
 * with the same tolerance for broken blocks, but no submission. A preview has
 * no lesson id, so `POST /api/lessons/{id}/attempts` has nowhere to go — the
 * action is present and disabled with the reason beside it, never missing and
 * never pretending to send.
 *
 * Rendered model output stays untrusted here exactly as in the reader
 * (ADR-0001): blocks render through the registry, never as markup.
 */
export function LessonPreview({ data }: { data: InterviewLessonPayload }) {
  const parsed = lessonResponseSchema.safeParse({
    lesson: data.lesson,
    terms: data.terms,
    resources: data.resources,
  })

  if (!parsed.success) {
    return (
      <Alert
        color="red"
        role="alert"
        variant="light"
        radius="md"
        title="This lesson could not be shown"
      >
        <Text size="sm">
          The tutor sent a lesson this app cannot read. The mission draft above is still yours to
          review.
        </Text>
      </Alert>
    )
  }

  return <PreviewFrame lesson={parsed.data} />
}

function PreviewFrame({ lesson }: { lesson: ParsedLessonResponse }) {
  const { blocks, skipped } = parseLessonBlocks(lesson.lesson.blocks)
  const isNewerThanApp = lesson.lesson.schemaVersion > SUPPORTED_SCHEMA_VERSION

  return (
    <LessonProvider lesson={lesson}>
      <Stack gap="xl" component="section" aria-label="The tutor's first lesson">
        <LessonHeaderView lesson={lesson.lesson} />

        {isNewerThanApp ? <NewerVersionNotice version={lesson.lesson.schemaVersion} /> : null}

        {skipped.length > 0 ? <SkippedBlocksNotice skipped={skipped} /> : null}

        <LessonBlocks blocks={blocks} />

        <LessonSourceList />

        <PreviewSubmitNote />
      </Stack>
    </LessonProvider>
  )
}

/**
 * Why the action is unavailable, in words, beside the action it explains —
 * the same unavailable-action-with-a-reason pattern as the mission confirm.
 */
function PreviewSubmitNote() {
  const reasonId = useId()

  return (
    <Stack component="section" gap="md">
      <Title order={2}>Send your answers</Title>

      <Group align="flex-start" justify="space-between" wrap="nowrap" gap="md">
        <Button disabled aria-describedby={reasonId}>
          Send my answers
        </Button>

        <Text component="p" id={reasonId} size="sm" c="dimmed">
          Answers cannot be sent from this preview. This lesson is not saved to the workspace yet,
          so there is nowhere to send them.
        </Text>
      </Group>
    </Stack>
  )
}
