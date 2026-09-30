import { Button, Center, Stack, Text, Title } from '@mantine/core'
import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <Center mih="60vh" px="md">
      <Stack align="center" gap="xs" ta="center">
        <Title order={1}>Page not found</Title>
        <Text c="dimmed">The page you are looking for does not exist.</Text>
        <Button component={Link} to="/" mt="sm">
          Back to home
        </Button>
      </Stack>
    </Center>
  )
}
