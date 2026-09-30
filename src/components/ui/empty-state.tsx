import type { PropsWithChildren } from 'react'
import { Stack, Text, Title } from '@mantine/core'

type EmptyStateProps = PropsWithChildren<{
  title: string
  description?: string
}>

export function EmptyState({
  title,
  description,
  children,
}: EmptyStateProps) {
  return (
    <Stack align="center" gap="xs" py="xl" ta="center">
      <Title order={3}>{title}</Title>
      {description ? <Text c="dimmed">{description}</Text> : null}
      {children}
    </Stack>
  )
}
