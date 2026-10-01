import { Stack, Text, Title } from '@mantine/core'

export function HomePage() {
  return (
    <Stack gap="xs" py="xl">
      <Title order={1}>AI tutor</Title>
      <Text c="dimmed" maw={640}>
        The application shell and authentication are ready. Build the first feature under
        src/features and wire its route in src/app/router.tsx. See
        docs/AI-TUTOR-FRONTEND-ONBOARDING.md for the build order, and docs/lesson-schema.json for
        the lesson contract.
      </Text>
    </Stack>
  )
}
