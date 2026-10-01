import type { PropsWithChildren } from 'react'
import { Button, Stack, Text, Title } from '@mantine/core'

type ErrorStateProps = PropsWithChildren<{
  title?: string
  message?: string
  onRetry?: () => void
}>

export function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred.',
  onRetry,
  children,
}: ErrorStateProps) {
  return (
    <Stack align="center" gap="xs" py="xl" ta="center" role="alert">
      <Title order={3}>{title}</Title>
      <Text c="dimmed" maw={480}>
        {message}
      </Text>
      <Stack gap="xs" align="center" mt="xs">
        {onRetry ? (
          <Button variant="light" onClick={onRetry}>
            Try again
          </Button>
        ) : null}
        {children}
      </Stack>
    </Stack>
  )
}
