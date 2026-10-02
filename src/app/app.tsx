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

        {/*
            No `bg` and no `c` here, on purpose.

            Both used to be pinned to single shades of the ramp — `bg="gray.3"` and
            `c="gray.8"` — which are light-scheme values with no dark counterpart. In
            the dark scheme that painted a near-white content area and, worse, set
            every piece of text inside it to a light-mode dark grey. Anything in here
            that carried its own surface then put light-scheme text on a dark
            background: a code block measured 1.19:1, which is unreadable.

            Leaving both unset hands them to Mantine, whose defaults are the semantic
            `--mantine-color-body` and `--mantine-color-text` and therefore follow the
            scheme. `theme.test.tsx` and `app.test.tsx` both exist to keep this from
            coming back.
        */}
        <AppShell.Main>
          <PageContainer>
            <Outlet />
          </PageContainer>
        </AppShell.Main>
      </AppShell>
    </>
  )
}
