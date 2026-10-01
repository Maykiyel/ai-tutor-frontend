import { Alert, Anchor, Center, Container, Paper, Stack, Text, Title } from '@mantine/core'
import { useMutation } from '@tanstack/react-query'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'

import { paths } from '@/config/paths'
import { getAuthErrorMessage } from '@/features/auth/api/auth-api'
import { LoginForm } from '@/features/auth/components/login-form'
import { authMutations } from '@/features/auth/queries/auth-mutations'
import type { LoginFormValues } from '@/features/auth/schemas/login-schema'
import { useAuthStore } from '@/features/auth/store'

function getRedirectTarget(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return paths.home.getHref()
  }

  return value
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const setAuth = useAuthStore((state) => state.setAuth)
  const mutation = useMutation(authMutations.login())

  const handleSubmit = async (values: LoginFormValues) => {
    try {
      const session = await mutation.mutateAsync(values)
      setAuth(session)

      await navigate(getRedirectTarget(searchParams.get('redirectTo')), {
        replace: true,
      })
    } catch {
      // The mutation state renders the error message.
    }
  }

  const registrationMessage = location.state?.message as string | undefined

  return (
    <Center mih="100vh" px="md">
      <Container size={420} w="100%">
        <Stack>
          <div>
            <Title order={1}>Welcome back</Title>
            <Text c="dimmed">Sign in to continue.</Text>
          </div>

          <Paper withBorder p="xl" radius="md">
            <Stack>
              {registrationMessage && <Alert color="lime">{registrationMessage}</Alert>}

              {mutation.isError && <Alert color="red">{getAuthErrorMessage(mutation.error)}</Alert>}

              <LoginForm onSubmit={handleSubmit} isSubmitting={mutation.isPending} />

              <Text size="sm" c="dimmed">
                No account?{' '}
                <Anchor component={Link} to={paths.auth.register.getHref()}>
                  Create one
                </Anchor>
              </Text>
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </Center>
  )
}
