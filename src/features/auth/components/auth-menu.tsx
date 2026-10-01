import { Avatar, Group, Menu, Text } from '@mantine/core'

import { useAuth } from '../hooks/use-auth'
import { LogoutButton } from './logout-button'

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
      <Menu.Target>
        <Group gap="xs" style={{ cursor: 'pointer' }} wrap="nowrap">
          <Avatar color="lime" radius="xl" size="sm">
            {getInitials(user.username)}
          </Avatar>
          <Text size="sm" fw={500} visibleFrom="xs">
            {user.username}
          </Text>
        </Group>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>Signed in as</Menu.Label>
        <Menu.Item disabled>{user.username}</Menu.Item>

        <Menu.Divider />

        {/* LogoutButton owns its own mutation and pending state. */}
        <Menu.Item closeMenuOnClick={false} px={4} py={4}>
          <LogoutButton />
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  )
}
