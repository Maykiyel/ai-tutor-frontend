import { Badge, Button, Card, Group, List, Stack, Text, Title } from '@mantine/core'
import { Link } from 'react-router'

import { paths } from '@/config/paths'

import type { MissionDraft } from '../schemas/interview-schema'

function DraftList({ label, entries }: { label: string; entries: string[] }) {
  return (
    <Stack gap={4}>
      <Text fw={600}>{label}</Text>
      {entries.length > 0 ? (
        <List spacing={4}>
          {entries.map((entry) => (
            <List.Item key={entry}>{entry}</List.Item>
          ))}
        </List>
      ) : (
        <Text c="dimmed">Not settled in the interview.</Text>
      )}
    </Stack>
  )
}

type MissionDraftCardProps = {
  draft: MissionDraft | null
  /** Whether the backend saved this mission as the workspace's active one. */
  saved: boolean
  workspaceId: string
  onStartOver: () => void
}

/**
 * The mission the interview ended with, laid out as the four parts a mission
 * has.
 *
 * The practice route saves the mission itself on the turn that ends the
 * interview, so there is no confirm step to take here. `docs/spec.md` asks for
 * explicit learner confirmation before a mission counts; that waits on the
 * agreed `PUT /api/workspaces/{id}/mission`. A saved mission leads back to the
 * workspace. A draft the backend did not save, because the interview ended
 * without a reason to learn, can only be started over.
 */
export function MissionDraftCard({
  draft,
  saved,
  workspaceId,
  onStartOver,
}: MissionDraftCardProps) {
  return (
    <Card withBorder radius="md" padding="lg">
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Title order={2} size="h3">
            Your mission
          </Title>
          {saved ? (
            <Badge variant="light" color="green">
              Saved
            </Badge>
          ) : (
            <Badge variant="light" color="gray">
              Draft
            </Badge>
          )}
        </Group>

        <Stack gap={4}>
          <Text fw={600}>Why</Text>
          {draft?.why ? (
            <Text maw="65ch">{draft.why}</Text>
          ) : (
            <Text c="dimmed">Not settled in the interview.</Text>
          )}
        </Stack>

        <DraftList label="Success looks like" entries={draft?.success ?? []} />
        <DraftList label="Constraints" entries={draft?.constraints ?? []} />
        <DraftList label="Out of scope" entries={draft?.outOfScope ?? []} />

        {saved ? (
          <Group mt="sm">
            <Button component={Link} to={paths.workspaces.home.getHref(workspaceId)}>
              Go to the workspace
            </Button>
          </Group>
        ) : (
          <Stack gap="xs" mt="sm" align="flex-start">
            <Text size="sm" c="dimmed">
              This draft was not saved to the workspace. Start over to run the interview again.
            </Text>
            <Button variant="light" onClick={onStartOver}>
              Start over
            </Button>
          </Stack>
        )}
      </Stack>
    </Card>
  )
}
