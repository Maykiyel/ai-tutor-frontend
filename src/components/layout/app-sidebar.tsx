import type { PropsWithChildren } from 'react'
import { AppShell, Divider, NavLink, Stack, Text } from '@mantine/core'
import { Link, useLocation } from 'react-router'

import type { NavSection } from '@/config/paths'

type AppSidebarProps = PropsWithChildren<{
  sections: NavSection[]
}>

/**
 * The sections are decided by the caller from the workspace id in the path, so
 * this component stays layout only. Children render above the sections, which
 * is where the workspace switcher goes.
 */
export function AppSidebar({ sections, children }: AppSidebarProps) {
  const { pathname } = useLocation()

  return (
    <AppShell.Navbar p="md">
      {children ? <AppShell.Section>{children}</AppShell.Section> : null}

      <AppShell.Section grow component={Stack} gap="md">
        {sections.map((section, index) => (
          <Stack key={section.label} gap={4}>
            <Text size="xs" fw={700} tt="uppercase" c="dimmed" px="sm">
              {section.label}
            </Text>

            {section.items.map((item) => {
              const isCurrent = pathname === item.to

              return (
                <NavLink
                  key={item.to}
                  component={Link}
                  to={item.to}
                  label={item.label}
                  active={isCurrent}
                  aria-current={isCurrent ? 'page' : undefined}
                />
              )
            })}

            {index < sections.length - 1 && <Divider mt="sm" />}
          </Stack>
        ))}
      </AppShell.Section>
    </AppShell.Navbar>
  )
}
