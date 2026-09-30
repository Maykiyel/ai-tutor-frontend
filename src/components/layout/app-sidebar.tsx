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

            {section.items.map((item) => {
              if ('children' in item) {
                return (
                  <NavLink
                    key={item.label}
                    label={item.label}
                    component="button"
                    defaultOpened
                    childrenOffset={28}
                  >
                    {item.children.map((child) => (
                      <NavLink
                        key={child.label}
                        label={child.label}
                        renderRoot={(props) => <RouterNavLink {...props} to={child.to} end />}
                      />
                    ))}
                  </NavLink>
                )
              }

              return (
                <NavLink
                  key={item.label}
                  label={item.label}
                  renderRoot={(props) => <RouterNavLink {...props} to={item.to} end />}
                />
              )
            })}

            {index < navigation.length - 1 && <Divider mt="sm" />}
          </Stack>
        ))}
      </AppShell.Section>
    </AppShell.Navbar>
  )
}
