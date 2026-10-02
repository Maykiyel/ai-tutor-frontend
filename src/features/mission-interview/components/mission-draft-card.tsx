import { Badge, Button, Card, Group, List, Stack, Text, Title } from '@mantine/core'
import { useId } from 'react'

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
  onStartOver: () => void
}

/**
 * The mission the interview ended with, laid out as the four parts a mission
 * has, and the confirm step it needs before it counts.
 *
 * A mission change needs explicit learner confirmation (`docs/spec.md`), and
 * the endpoint that would take it, `PUT /api/workspaces/{id}/mission`, does not
 * exist yet. So the step is here and says why it cannot be taken: an
 * unavailable action with a reason, never a button that pretends to save.
 */
export function MissionDraftCard({ draft, onStartOver }: MissionDraftCardProps) {
  const reasonId = useId()

  return (
    <Card withBorder radius="md" padding="lg">
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Title order={2} size="h3">
            Your mission
          </Title>
          <Badge variant="light" color="gray">
            Draft
          </Badge>
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

        <Group mt="sm">
          <Button disabled aria-describedby={reasonId}>
            Confirm this mission
          </Button>
          <Button variant="subtle" color="gray" onClick={onStartOver}>
            Start over
          </Button>
        </Group>

        <Text id={reasonId} size="sm" c="dimmed">
          Saving a mission needs a backend endpoint that is not built yet.
        </Text>
      </Stack>
    </Card>
  )
}
