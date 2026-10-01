import { Badge, Button, Card, Stack, Text, Title } from '@mantine/core'
import { useId } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'

import { ErrorState } from '@/components/ui/error-state'
import { LoadingState } from '@/components/ui/loading-state'
import { paths } from '@/config/paths'
import { missionQueries } from '@/lib/mission/mission-queries'
import type { Mission } from '@/lib/mission/mission-schema'

import { workspaceQueries } from '../queries/workspace-queries'

function ActiveMission({ mission, workspaceId }: { mission: Mission; workspaceId: string }) {
  return (
    <>
      <Badge variant="light" color="teal">
        Active mission
      </Badge>
      <Text>{mission.why}</Text>

      <Button
        mt="sm"
        component={Link}
        to={paths.workspaces.lessons.getHref(workspaceId)}
        styles={{ root: { alignSelf: 'flex-start' } }}
      >
        Ask for the next lesson
      </Button>

      <Text size="sm" c="dimmed">
        Changing it needs the mission interview, which is not built yet.
      </Text>
    </>
  )
}

function NoActiveMission() {
  const reasonId = useId()

  return (
    <>
      <Badge variant="light" color="gray">
        No active mission
      </Badge>
      <Text c="dimmed">
        A lesson is written to this mission, so there is nothing to ask for until there is one.
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

      {/*
        The interview is build-order step 4 and out of scope for this spec. The
        screen says so instead of offering a link to a screen that does not
        exist: an unavailable action with a reason, never a dead link.
      */}
      <Text size="sm" c="dimmed">
        The mission interview is not built yet.
      </Text>
    </>
  )
}

function MissionSection({ workspaceId }: { workspaceId: string }) {
  const mission = useQuery(missionQueries.mission(workspaceId))

  if (mission.isPending) {
    return <LoadingState message="Loading this mission..." />
  }

  if (mission.isError) {
    return (
      <ErrorState
        title="This mission could not be loaded"
        message="Nothing is lost. Try again."
        onRetry={() => void mission.refetch()}
      />
    )
  }

  /*
   * Missions are revisions with exactly one active per workspace, so the gate
   * asks about the active mission and not about whether a mission row came
   * back. A workspace whose only mission is superseded reads here as a
   * workspace with no mission, because that is what the backend will do with
   * it: no active mission, no lesson.
   */
  const activeMission = mission.data?.is_active ? mission.data : null

  return (
    <Stack gap="xs">
      <Text fw={600}>Mission</Text>
      {activeMission ? (
        <ActiveMission mission={activeMission} workspaceId={workspaceId} />
      ) : (
        <NoActiveMission />
      )}
    </Stack>
  )
}

export function WorkspaceHome() {
  const { workspaceId = '' } = useParams()
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
        <MissionSection workspaceId={workspaceId} />
      </Card>
    </Stack>
  )
}
