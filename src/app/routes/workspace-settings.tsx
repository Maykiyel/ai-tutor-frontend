import { NotYetBuilt } from '@/components/ui/not-yet-built'

export function WorkspaceSettingsPage() {
  return (
    <NotYetBuilt
      title="Settings"
      description="This workspace's teaching notes, its mission, and its community opt-out. Each of them waits on PATCH and DELETE /api/workspaces/{id}, which the backend has not agreed, so there is nothing here to change yet."
    />
  )
}
