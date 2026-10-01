import { Button, Menu } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'

import { paths } from '@/config/paths'

import { workspaceQueries } from '../queries/workspace-queries'

type WorkspaceSwitcherProps = {
  position?: 'bottom-start' | 'bottom-end'
  fullWidth?: boolean
}

/**
 * The switcher, in the header and at the top of the sidebar. Which workspaces
 * are on offer comes from the same list the learner sees, so a workspace they
 * have just created is switchable straight away.
 *
 * The button's accessible name carries the current topic as well as the action,
 * so the control is not just "a button that says Algebra" to a screen reader.
 */
export function WorkspaceSwitcher({
  position = 'bottom-start',
  fullWidth = true,
}: WorkspaceSwitcherProps) {
  const { workspaceId = '' } = useParams()
  const query = useQuery(workspaceQueries.list())

  const current = query.data?.find((workspace) => workspace.id === workspaceId)
  const label = current?.topic ?? 'Switch workspace'

  return (
    <Menu shadow="md" width={260} position={position}>
      <Menu.Target>
        <Button
          variant="default"
          fullWidth={fullWidth}
          loading={query.isPending}
          justify="space-between"
          aria-label={`Switch workspace: ${label}`}
        >
          {label}
        </Button>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>Your workspaces</Menu.Label>

        {query.data?.map((workspace) => (
          <Menu.Item
            key={workspace.id}
            component={Link}
            to={paths.workspaces.home.getHref(workspace.id)}
          >
            {workspace.topic}
          </Menu.Item>
        ))}

        <Menu.Divider />

        <Menu.Item component={Link} to={paths.workspaces.root.getHref()}>
          All workspaces
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  )
}
