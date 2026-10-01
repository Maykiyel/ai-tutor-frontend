import { Alert, Button, Group, Loader, Stack, Text, Title } from '@mantine/core'
import { useId } from 'react'
import { useQuery } from '@tanstack/react-query'

import { ErrorState } from '@/components/ui/error-state'
import { missionQueries } from '@/lib/mission/mission-queries'

type NextLessonPanelProps = {
  workspaceId: string
  isGenerating: boolean
  isAsking: boolean
  askFailed: boolean
  onAsk: () => void
}

/**
 * Everything about asking for the next lesson, in one place above the list.
 *
 * Four states, and they are exclusive rather than layered: a request that failed
 * is not also a generation in progress, a generation in progress is not also an
 * offer to ask, and a workspace with no mission is not waiting for anything.
 *
 * The gate is the active mission rather than the mere existence of one. Missions
 * are revisions with exactly one active per workspace, so a mission the backend
 * has superseded cannot have a lesson written to it, and a learner whose only
 * mission is superseded is in the same position as one who never had a mission.
 */
export function NextLessonPanel({
  workspaceId,
  isGenerating,
  isAsking,
  askFailed,
  onAsk,
}: NextLessonPanelProps) {
  const mission = useQuery(missionQueries.mission(workspaceId))

  /*
   * A refused request outranks everything else on screen: it is the newest thing
   * that happened, and it is what the learner is waiting to hear about. It also
   * cannot coexist with a generation in progress, because a failure clears the
   * pending flag.
   */
  if (askFailed) {
    return (
      <ErrorState
        title="Your next lesson could not be requested"
        message="Nothing was queued, so there is nothing to wait for. Try again — a lesson is written on request, not on a timer."
        onRetry={onAsk}
      />
    )
  }

  if (isGenerating || isAsking) {
    return <WaitingForLesson />
  }

  /*
   * Nothing is claimed while the mission is still being read. Showing the action
   * disabled "just in case" would be a guess, and showing it enabled would be a
   * promise the screen cannot keep yet.
   */
  if (mission.isPending) {
    return null
  }

  /*
   * A gate that cannot be read is not a gate that is closed. Saying "you have no
   * mission" because the check failed would be a lie the learner cannot act on,
   * so the screen says the action is unavailable *and* offers the retry that
   * decides it.
   */
  if (mission.isError) {
    return (
      <Alert
        role="alert"
        variant="light"
        color="red"
        radius="md"
        title="The next lesson is unavailable for now"
      >
        <Stack gap="xs">
          <Text size="sm">
            This workspace&apos;s mission could not be checked, and a lesson is written to its
            mission.
          </Text>
          <Button variant="light" size="xs" onClick={() => void mission.refetch()}>
            Check again
          </Button>
        </Stack>
      </Alert>
    )
  }

  return mission.data?.is_active ? (
    <Button onClick={onAsk} styles={{ root: { alignSelf: 'flex-start' } }}>
      Ask for the next lesson
    </Button>
  ) : (
    <UnavailableWithoutMission />
  )
}

/**
 * The waiting state. It says the wait is happening, how long a wait is normal,
 * and that the learner is free to leave — because they are, and the state follows
 * them. A spinner alone would say none of those three things.
 *
 * `role="status"` announces it when it appears, including when the learner comes
 * back to a screen that is already waiting.
 */
function WaitingForLesson() {
  return (
    <Alert role="status" variant="light" color="blue" radius="md" title="Writing your next lesson">
      <Group gap="sm" wrap="nowrap" align="flex-start">
        <Loader size="xs" mt={4} aria-hidden />
        <Text size="sm">
          This takes a minute or two. You do not have to stay on this page — go and read something
          else, and it will be in this list when it is ready.
        </Text>
      </Group>
    </Alert>
  )
}

function UnavailableWithoutMission() {
  const reasonId = useId()

  return (
    <Stack gap="xs">
      <Button disabled aria-describedby={reasonId} styles={{ root: { alignSelf: 'flex-start' } }}>
        Ask for the next lesson
      </Button>

      <div>
        <Title order={4}>No active mission</Title>
        <Text size="sm" c="dimmed">
          A lesson is written to your mission, so there is nothing to ask for until this workspace
          has one.
        </Text>
      </div>

      <Text id={reasonId} size="sm" c="dimmed">
        Unavailable until this workspace has a mission.
      </Text>
    </Stack>
  )
}
