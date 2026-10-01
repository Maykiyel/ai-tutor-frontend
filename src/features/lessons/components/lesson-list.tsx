import { Card, Group, Stack, Text, Title } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'

import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { LoadingState } from '@/components/ui/loading-state'
import { paths } from '@/config/paths'

import { lessonQueries } from '../queries/lesson-queries'
import type { LessonListEntry } from '../schemas/lesson-list-schema'

const kindLabels: Record<LessonListEntry['kind'], string> = {
  concept: 'Concept',
  'hands-on': 'Hands-on',
  review: 'Review',
}

/**
 * The way in to a lesson. Generation and the waiting state belong to a later
 * ticket; what matters here is that each row is a real link to the reader, so
 * the reader is reachable from the list rather than only by deep link.
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

  return (
    <Stack gap="lg" py="xl">
      <div>
        <Title order={1}>Lessons</Title>
        <Text c="dimmed">Each lesson is one skill and one win, at most fifteen minutes.</Text>
      </div>

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

      {query.data?.length === 0 ? (
        <EmptyState
          title="No lessons yet"
          description="Ask for the next lesson from your workspace home, and it will appear here when it is written."
        />
      ) : null}

      {query.data && query.data.length > 0 ? (
        <Stack gap="sm">
          {query.data.map((entry) => (
            <LessonCard key={entry.id} entry={entry} workspaceId={workspaceId} />
          ))}
        </Stack>
      ) : null}
    </Stack>
  )
}
