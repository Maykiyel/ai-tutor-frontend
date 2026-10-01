import { Button, Card, Group, Stack, Text, Title } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'

import { paths } from '@/config/paths'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { LoadingState } from '@/components/ui/loading-state'

import { workspaceQueries } from '../queries/workspace-queries'
import type { Workspace } from '../schemas/workspace-schema'

function WorkspaceCard({ workspace }: { workspace: Workspace }) {
  return (
    <Card
      component={Link}
      to={paths.workspaces.home.getHref(workspace.id)}
      withBorder
      radius="md"
      padding="lg"
    >
      <Title order={2}>{workspace.topic}</Title>
      <Text size="sm" c="dimmed" mt={4}>
        Your mission, lessons, sources, and records live here.
      </Text>
    </Card>
  )
}

export function WorkspaceList() {
  const query = useQuery(workspaceQueries.list())

  return (
    <Stack gap="lg" py="xl">
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={1}>Your workspaces</Title>
          <Text c="dimmed">Pick a topic to carry on with, or start a new one.</Text>
        </div>

        <Button component={Link} to={paths.workspaces.create.getHref()}>
          New workspace
        </Button>
      </Group>

      {/*
        The states are exclusive: a failed list is never also an empty one, and
        the heading and the create action stay put so the learner does not lose
        their place when the request settles.
      */}
      {query.isPending ? <LoadingState message="Loading your workspaces..." /> : null}

      {query.isError ? (
        <ErrorState
          title="Your workspaces could not be loaded"
          message="The list did not come back. Nothing is lost — try again."
          onRetry={() => void query.refetch()}
        />
      ) : null}

      {query.data?.length === 0 ? (
        <EmptyState
          title="No workspaces yet"
          description="A workspace is one topic you are learning, with one mission. Everything for that topic — your mission, lessons, sources, glossary, and records — lives inside it."
        >
          <Button component={Link} to={paths.workspaces.create.getHref()}>
            Create your first workspace
          </Button>
        </EmptyState>
      ) : null}

      {query.data && query.data.length > 0 ? (
        <Group align="stretch" gap="md">
          {query.data.map((workspace) => (
            <WorkspaceCard key={workspace.id} workspace={workspace} />
          ))}
        </Group>
      ) : null}
    </Stack>
  )
}
