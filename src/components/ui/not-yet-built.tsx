import { Group, Stack, Text, Title } from '@mantine/core'

type NotYetBuiltProps = {
  title: string
  description: string
}

/**
 * For a screen whose path exists and whose backend does not. The learner is
 * told the screen is not built and what will be on it, rather than being sent
 * to a 404 or a link that goes nowhere.
 */
export function NotYetBuilt({ title, description }: NotYetBuiltProps) {
  return (
    <Stack gap="xs" py="xl">
      <Group gap="sm" align="baseline">
        <Title order={1}>{title}</Title>
        <Text size="xs" fw={700} tt="uppercase" c="dimmed">
          Not built yet
        </Text>
      </Group>

      <Text c="dimmed" maw={640}>
        {description}
      </Text>
    </Stack>
  )
}
