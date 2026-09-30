import { Button, Center } from '@mantine/core'
import { Link, isRouteErrorResponse, useRouteError } from 'react-router'

import { ErrorState } from '@/components/ui/error-state'

export function RootErrorBoundary() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'An unexpected error occurred.'

  return (
    <Center mih="60vh" px="md">
      <ErrorState
        message={message}
        onRetry={() => window.location.reload()}
      >
        <Button component={Link} to="/" variant="subtle">
          Back to home
        </Button>
      </ErrorState>
    </Center>
  )
}
