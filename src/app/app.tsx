import { AppShell, Group } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { Outlet, ScrollRestoration, useParams } from 'react-router'

import { AppHeader } from '@/components/layout/app-header'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { PageContainer } from '@/components/layout/page-container'
import { appNavigation, getWorkspaceNavigation } from '@/config/paths'
import { AuthMenu } from '@/features/auth/components/auth-menu'
import { WorkspaceSwitcher } from '@/features/workspace/components/workspace-switcher'

export default function App() {
  const [opened, { toggle }] = useDisclosure()

  // Workspace identity lives in the path, so the shell reads it from there
  // rather than from a list declared once. Outside a workspace there is no id
  // and the sidebar shows only the sections that are not inside one.
  const { workspaceId } = useParams()
  const sections = workspaceId
    ? [...getWorkspaceNavigation(workspaceId), ...appNavigation]
    : appNavigation

  return (
    <>
      <ScrollRestoration />

      <AppShell
        header={{ height: 60 }}
        navbar={{
          width: 240,
          breakpoint: 'sm',
          collapsed: { mobile: !opened },
        }}
      >
        <AppHeader opened={opened} toggle={toggle}>
          <Group gap="sm" wrap="nowrap">
            {workspaceId ? <WorkspaceSwitcher position="bottom-end" fullWidth={false} /> : null}
            <AuthMenu />
          </Group>
        </AppHeader>

        <AppSidebar sections={sections}>{workspaceId ? <WorkspaceSwitcher /> : null}</AppSidebar>

        <AppShell.Main bg={'gray.3'} c={'gray.8'}>
          <PageContainer>
            <Outlet />
          </PageContainer>
        </AppShell.Main>
      </AppShell>
    </>
  )
}
