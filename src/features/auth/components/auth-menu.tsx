import { Avatar, Group, Menu, Text, UnstyledButton } from '@mantine/core'

import { useAuth } from '../hooks/use-auth'
import { LogoutMenuItem } from './logout-menu-item'

function getInitials(username: string): string {
  return username.slice(0, 2).toUpperCase()
}

export function AuthMenu() {
  const { user } = useAuth()

  // The AppShell only renders behind requireAuth, so a signed-in user is
  // always present here. This guard satisfies the type checker; it is not a
  // state a visitor can reach.
  if (!user) {
    return null
  }

  return (
    <Menu shadow="md" width={220} position="bottom-end">
      {/*
          A real button, so the menu is a tab stop and Enter or Space opens it. It
          used to be a plain group, which a pointer could open and a keyboard could
          not reach at all. The name says what the control is as well as who is
          signed in, because the avatar's initials alone name nothing.
      */}
      <Menu.Target>
        <UnstyledButton
          aria-label={`Account menu, signed in as ${user.username}`}
          className="mantine-focus-auto"
        >
          <Group gap="xs" wrap="nowrap">
            <Avatar color="lime" radius="xl" size="sm" aria-hidden>
              {getInitials(user.username)}
            </Avatar>
            <Text size="sm" fw={500} visibleFrom="xs">
              {user.username}
            </Text>
          </Group>
        </UnstyledButton>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>Signed in as</Menu.Label>
        <Menu.Item disabled>{user.username}</Menu.Item>

        <Menu.Divider />

        <LogoutMenuItem />
      </Menu.Dropdown>
    </Menu>
  )
}
