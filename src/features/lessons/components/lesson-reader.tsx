import { Alert, Box, Container, List, Stack, Text } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router'

import { ErrorState } from '@/components/ui/error-state'
import { LoadingState } from '@/components/ui/loading-state'

import { LessonProvider } from '../blocks/lesson-context'
import { describeSkippedBlock, parseLessonBlocks, type SkippedBlock } from '../blocks/parse-blocks'
import { blockRegistry, type BlockComponent, type ParsedLessonBlock } from '../blocks/registry'
import { lessonQueries } from '../queries/lesson-queries'
import {
  SUPPORTED_SCHEMA_VERSION,
  type LessonBlock,
  type ParsedLessonResponse,
} from '../schemas/lesson-schema'
import { BackToLessonsLink, LessonHeaderView } from './lesson-header'
import { LessonSourceList } from './lesson-source-list'
import { LessonSubmitPanel } from './lesson-submit-panel'

export function LessonReader() {
  const { lessonId = '' } = useParams()
  const query = useQuery(lessonQueries.detail(lessonId))

  if (query.isPending) {
    return <LoadingState message="Loading this lesson..." />
  }

  // A header or a hydrated map that does not validate is not a partial lesson,
  // it is a response the app cannot read. Say so and offer a retry, rather than
  // rendering a blank page the learner cannot act on.
  if (query.isError) {
    return (
      <ErrorState
        title="This lesson could not be loaded"
        message="The lesson did not come back in a form this app can read. Nothing is lost — try again."
        onRetry={() => void query.refetch()}
      />
    )
  }

  return <LessonFrame lesson={query.data} lessonId={lessonId} />
}

/**
 * The tolerant outer frame around a strict inner parse: a lesson newer than the
 * app, or one with a broken block, still renders everything the app can read.
 * See ADR-0002.
 */
function LessonFrame({ lesson, lessonId }: { lesson: ParsedLessonResponse; lessonId: string }) {
  const { blocks, skipped } = parseLessonBlocks(lesson.lesson.blocks)
  const isNewerThanApp = lesson.lesson.schemaVersion > SUPPORTED_SCHEMA_VERSION

  return (
    <LessonProvider lesson={lesson}>
      <Container size="md" py="xl">
        <Stack gap="xl">
          <BackToLessonsLink />

          <LessonHeaderView lesson={lesson.lesson} />

          {isNewerThanApp ? <NewerVersionNotice version={lesson.lesson.schemaVersion} /> : null}

          {skipped.length > 0 ? <SkippedBlocksNotice skipped={skipped} /> : null}

          <LessonBlocks blocks={blocks} />

          {/* The sources come after the prose, from the same hydrated map the
              citations resolve against, so the foot of the lesson is where the
              learner looks when they want to check a claim. */}
          <LessonSourceList />

          {/*
              One submit action for the whole lesson, last, after every practice
              block has been read and answered. It receives the parsed blocks and
              nothing else: what a practice block *is* is the submit panel's business,
              not the frame's, so a new block type is a change in one file rather than
              in the reader as well.
          */}
          <LessonSubmitPanel lessonId={lessonId} blocks={blocks} />
        </Stack>
      </Container>
    </LessonProvider>
  )
}

/**
 * A newer `schemaVersion` is a warning, never a refusal. The learner reads
 * whatever parsed; hard-refusing would hide a lesson they are entitled to read
 * and turn a rendering gap into a dead end. See ADR-0002.
 */
function NewerVersionNotice({ version }: { version: number }) {
  return (
    <Alert
      role="status"
      variant="light"
      color="yellow"
      radius="md"
      title="This lesson is newer than the app"
    >
      <Text size="sm">
        It was saved in format version {version}, and this app understands version{' '}
        {SUPPORTED_SCHEMA_VERSION}. Everything this app can read is shown below; anything that
        needed the newer format may be missing.
      </Text>
    </Alert>
  )
}

/**
 * A gap must not read as a short lesson. When blocks were skipped the learner is
 * told, because "this lesson is brief" and "part of this lesson failed to load"
 * are very different conclusions to draw from the same screen.
 *
 * And told what each gap was, one line per skipped block in lesson order. A count
 * on its own says something is missing but not whether it matters: a missing
 * heading and a missing quiz are not the same loss, and only the second changes
 * what the learner can send at the end.
 */
function SkippedBlocksNotice({ skipped }: { skipped: SkippedBlock[] }) {
  const count = skipped.length

  return (
    <Alert
      role="status"
      variant="light"
      color="gray"
      radius="md"
      title="Part of this lesson is missing"
    >
      <Text size="sm">
        {count === 1
          ? 'One part of this lesson could not be shown. '
          : `${count} parts of this lesson could not be shown. `}
        Everything else below is complete.
      </Text>

      <List size="sm" mt="xs">
        {skipped.map((block, index) => (
          <List.Item key={index}>{describeSkippedBlock(block)}</List.Item>
        ))}
      </List>
    </Alert>
  )
}

function LessonBlocks({ blocks }: { blocks: ParsedLessonBlock[] }) {
  return (
    <Box component="section">
      <Stack gap="lg">
        {blocks.map((parsed, index) => (
          <RenderedBlock key={index} parsed={parsed} />
        ))}
      </Stack>
    </Box>
  )
}

/**
 * The one place a parsed block meets its component, and therefore the one place
 * the registry is read at render time. The cast is what keeps the registry the
 * only link: `ParsedLessonBlock` already pairs each `type` with a block of that
 * type, and the pair was just validated by that type's own schema. Writing a
 * `switch` here instead would mean every new block type had to be added to a
 * second place, which is the thing the registry exists to prevent.
 */
function RenderedBlock({ parsed }: { parsed: ParsedLessonBlock }) {
  const { Component } = blockRegistry[parsed.type] as {
    Component: BlockComponent<LessonBlock>
  }

  return <Component block={parsed.block} />
}
