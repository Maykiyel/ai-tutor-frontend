import { Button, Center, Stack, Text, Title } from '@mantine/core'
import { Link } from 'react-router'

import { paths } from '@/config/paths'

export function NotFoundPage() {
  return (
    <Center mih="60vh" px="md">
      <Stack align="center" gap="xs" ta="center">
        <Title order={1}>Page not found</Title>
        <Text c="dimmed">The page you are looking for does not exist.</Text>
        <Button component={Link} to={paths.workspaces.root.getHref()} mt="sm">
          Back to your workspaces
        </Button>
      </Stack>
    </Center>
  )
}
