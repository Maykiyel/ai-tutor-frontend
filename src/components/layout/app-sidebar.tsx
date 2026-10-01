import { AppShell, Divider, NavLink, Stack, Text } from '@mantine/core'
import { NavLink as RouterNavLink } from 'react-router'

import { navigation } from '@/config/paths'

export function AppSidebar() {
  return (
    <AppShell.Navbar p="md">
      <AppShell.Section grow component={Stack} gap="md">
        {navigation.map((section, index) => (
          <Stack key={section.label} gap={4}>
            <Text size="xs" fw={700} tt="uppercase" c="dimmed" px="sm">
              {section.label}
            </Text>

            {section.items.map((item) => (
              <NavLink
                key={item.label}
                label={item.label}
                renderRoot={(props) => <RouterNavLink {...props} to={item.to} end />}
              />
            ))}

            {index < navigation.length - 1 && <Divider mt="sm" />}
          </Stack>
        ))}
      </AppShell.Section>
    </AppShell.Navbar>
  )
}
