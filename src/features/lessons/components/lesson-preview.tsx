import { Alert, Button, Group, Stack, Text, Title } from '@mantine/core'
import { useId } from 'react'
import { Link } from 'react-router'

import { paths } from '@/config/paths'

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
  /** The saved lesson's id, or null when the backend kept it as a preview only. */
  lessonId?: string | null
}

/**
 * A generated lesson shown under the finished interview: the same blocks the
 * reader renders, with the same tolerance for broken blocks, but no submission.
 *
 * When the backend saved the lesson, answers go through the reader, so the
 * action here leads to it. When it did not, the lesson has no id and
 * `POST /api/lessons/{id}/attempts` has nowhere to go: the action is present
 * and disabled with the reason beside it, never missing and never pretending
 * to send.
 *
 * Rendered model output stays untrusted here exactly as in the reader
 * (ADR-0001): blocks render through the registry, never as markup.
 */
export function LessonPreview({
  data,
  workspaceId,
}: {
  data: InterviewLessonPayload
  workspaceId: string
}) {
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

  const lessonHref = data.lessonId
    ? paths.workspaces.lessonDetail.getHref(workspaceId, data.lessonId)
    : null

  return <PreviewFrame lesson={parsed.data} lessonHref={lessonHref} />
}

function PreviewFrame({
  lesson,
  lessonHref,
}: {
  lesson: ParsedLessonResponse
  lessonHref: string | null
}) {
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

        <PreviewSubmitNote lessonHref={lessonHref} />
      </Stack>
    </LessonProvider>
  )
}

/**
 * Where answers go from here. A saved lesson links to the reader, which takes
 * them. An unsaved one keeps the action disabled, with the reason in words
 * beside it.
 */
function PreviewSubmitNote({ lessonHref }: { lessonHref: string | null }) {
  const reasonId = useId()

  return (
    <Stack component="section" gap="md">
      <Title order={2}>Send your answers</Title>

      <Group align="flex-start" justify="space-between" wrap="nowrap" gap="md">
        {lessonHref ? (
          <Button component={Link} to={lessonHref} aria-describedby={reasonId}>
            Open the lesson
          </Button>
        ) : (
          <Button disabled aria-describedby={reasonId}>
            Send my answers
          </Button>
        )}

        <Text component="p" id={reasonId} size="sm" c="dimmed">
          {lessonHref
            ? 'This lesson is saved to the workspace. Open it to answer the questions and send them.'
            : 'Answers cannot be sent from this preview. This lesson is not saved to the workspace yet, so there is nowhere to send them.'}
        </Text>
      </Group>
    </Stack>
  )
}
