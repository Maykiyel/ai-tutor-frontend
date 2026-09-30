import type { PropsWithChildren } from 'react'
import { AppShell, Burger, Group, Text } from '@mantine/core'

type AppHeaderProps = PropsWithChildren<{
  title?: string
  opened: boolean
  toggle: () => void
}>

export function AppHeader({
  title = 'Hackathon Starter',
  opened,
  toggle,
  children,
}: AppHeaderProps) {
  return (
    <AppShell.Header px="md">
      <Group h="100%" justify="space-between">
        <Group gap="sm">
          <Burger
            opened={opened}
            onClick={toggle}
            hiddenFrom="sm"
            size="sm"
            aria-label="Toggle navigation"
          />

          <Text fw={600}>{title}</Text>
        </Group>

        {children}
      </Group>
    </AppShell.Header>
  )
}
