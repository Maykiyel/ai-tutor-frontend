import { Stack, Text, Title } from '@mantine/core'

export function HomePage() {
  return (
    <Stack gap="xs" py="xl">
      <Title order={1}>Hackathon starter</Title>
      <Text c="dimmed" maw={640}>
        The application shell is ready. Add your first feature under src/features and wire its route
        in src/app/router.tsx.
      </Text>
    </Stack>
  )
}
