import { AppShell } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { Outlet, ScrollRestoration } from 'react-router'

import { AppHeader } from '@/components/layout/app-header'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { PageContainer } from '@/components/layout/page-container'

export default function App() {
  const [opened, { toggle }] = useDisclosure()

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
        <AppHeader opened={opened} toggle={toggle} />
        <AppSidebar />

        <AppShell.Main bg={'gray.3'} c={'gray.8'}>
          <PageContainer>
            <Outlet />
          </PageContainer>
        </AppShell.Main>
      </AppShell>
    </>
  )
}
