import { Loader, Stack, Text } from '@mantine/core'

type LoadingStateProps = {
  message?: string
}

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <Stack align="center" gap="xs" py="xl" role="status" aria-live="polite">
      <Loader size="sm" />
      <Text c="dimmed" size="sm">
        {message}
      </Text>
    </Stack>
  )
}
