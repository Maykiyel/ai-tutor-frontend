import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router'

import { ErrorState } from '@/components/ui/error-state'
import { LoadingState } from '@/components/ui/loading-state'
import { MissionInterview } from '@/features/mission-interview/components/mission-interview'
import { workspaceQueries } from '@/features/workspace/queries/workspace-queries'

/**
 * The interview needs the workspace's topic, and the workspace read belongs to
 * the workspace feature. Features do not import from one another, so the route
 * is where the two meet: it reads the workspace and hands the interview the
 * one thing it needs from it.
 */
export function WorkspaceMissionInterviewPage() {
  const { workspaceId = '' } = useParams()
  const workspace = useQuery(workspaceQueries.detail(workspaceId))

  if (workspace.isPending) {
    return <LoadingState message="Loading this workspace..." />
  }

  if (workspace.isError) {
    return (
      <ErrorState
        title="This workspace could not be loaded"
        message="Nothing is lost. Try again."
        onRetry={() => void workspace.refetch()}
      />
    )
  }

  return <MissionInterview workspaceId={workspaceId} topic={workspace.data.topic} />
}
