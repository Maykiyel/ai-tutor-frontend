import { Card, Group, Stack, Text, Title } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'

import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { LoadingState } from '@/components/ui/loading-state'
import { paths } from '@/config/paths'

import { useNextLessonGeneration } from '../hooks/use-next-lesson-generation'
import { lessonQueries } from '../queries/lesson-queries'
import type { LessonListEntry } from '../schemas/lesson-list-schema'
import type { LessonKind } from '../schemas/lesson-schema'
import { NextLessonPanel } from './next-lesson-panel'

const kindLabels: Record<LessonKind, string> = {
  concept: 'Concept',
  'hands-on': 'Hands-on',
  review: 'Review',
}

/**
 * A row is a real link to the reader, so a lesson is reachable by choosing it
 * rather than only by deep link. The kind and the length are in words as well as
 * in position, because a row has to be readable at a glance and readable aloud.
 */
function LessonCard({ entry, workspaceId }: { entry: LessonListEntry; workspaceId: string }) {
  return (
    <Card
      component={Link}
      to={paths.workspaces.lessonDetail.getHref(workspaceId, entry.id)}
      withBorder
      radius="md"
      padding="lg"
    >
      <Group gap="xs">
        <Text size="xs" fw={700} tt="uppercase" c="dimmed">
          Lesson {entry.number} · {kindLabels[entry.kind]}
        </Text>
        <Text size="xs" c="dimmed">
          {entry.minutes} min
        </Text>
      </Group>

      <Title order={2} mt={4}>
        {entry.title}
      </Title>
    </Card>
  )
}

export function LessonList() {
  const { workspaceId = '' } = useParams()
  const query = useQuery(lessonQueries.list(workspaceId))
  const generation = useNextLessonGeneration(workspaceId, query.data)

  /*
   * The list is ordered here rather than trusted from the wire: a generation can
   * finish while the screen is open, and a list that gains a row in the middle is
   * a list the learner has to re-read to find their place.
   */
  const lessons = query.data ? [...query.data].sort((a, b) => a.number - b.number) : []

  return (
    <Stack gap="lg" py="xl">
      <div>
        <Title order={1}>Lessons</Title>
        <Text c="dimmed">Each lesson is one skill and one win, at most fifteen minutes.</Text>
      </div>

      <NextLessonPanel
        workspaceId={workspaceId}
        isGenerating={generation.isGenerating}
        isAsking={generation.isAsking}
        askFailed={generation.askFailed}
        onAsk={generation.askForNextLesson}
      />

      {/*
        The states are exclusive: a failed list is never also an empty one, and the
        heading stays put so the learner does not lose their place when the request
        settles.
      */}
      {query.isPending ? <LoadingState message="Loading your lessons..." /> : null}

      {query.isError ? (
        <ErrorState
          title="Your lessons could not be loaded"
          message="The list did not come back. Nothing is lost — try again."
          onRetry={() => void query.refetch()}
        />
      ) : null}

      {query.data && lessons.length === 0 ? (
        <EmptyState
          title="No lessons yet"
          description="Ask for the next lesson, and it will appear here when it is written."
        />
      ) : null}

      {lessons.length > 0 ? (
        <Stack gap="sm">
          {lessons.map((entry) => (
            <LessonCard key={entry.id} entry={entry} workspaceId={workspaceId} />
          ))}
        </Stack>
      ) : null}
    </Stack>
  )
}
