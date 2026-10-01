import { Button, Card, Stack, Text, Title } from '@mantine/core'
import { useId } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router'

import { ErrorState } from '@/components/ui/error-state'
import { LoadingState } from '@/components/ui/loading-state'

import { workspaceQueries } from '../queries/workspace-queries'

/**
 * The mission interview is build-order step 4 and the lesson list step 3, so
 * neither exists yet. The screen says so rather than linking somewhere that is
 * not there: an unavailable action with a reason, never a dead link.
 */
export function WorkspaceHome() {
  const { workspaceId = '' } = useParams()
  const reasonId = useId()
  const query = useQuery(workspaceQueries.detail(workspaceId))

  if (query.isPending) {
    return <LoadingState message="Loading this workspace..." />
  }

  if (query.isError) {
    return (
      <ErrorState
        title="This workspace could not be loaded"
        message="Nothing is lost. Try again."
        onRetry={() => void query.refetch()}
      />
    )
  }

  return (
    <Stack gap="lg" py="xl">
      <div>
        <Title order={1}>{query.data.topic}</Title>
        <Text c="dimmed">Everything for this topic lives in this workspace.</Text>
      </div>

      <Card withBorder radius="md" padding="lg">
        <Stack gap="xs">
          <Text fw={600}>Mission</Text>
          <Text c="dimmed">
            No mission yet. The mission interview is not built yet, so the tutor has nothing to aim
            at.
          </Text>

          <Button
            mt="sm"
            disabled
            aria-describedby={reasonId}
            styles={{ root: { alignSelf: 'flex-start' } }}
          >
            Ask for the next lesson
          </Button>

          <Text id={reasonId} size="sm" c="dimmed">
            Unavailable until this workspace has a mission.
          </Text>
        </Stack>
      </Card>
    </Stack>
  )
}
