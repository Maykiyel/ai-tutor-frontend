import { Alert, Anchor, Center, Container, Paper, Stack, Text, Title } from '@mantine/core'
import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { getAuthErrorMessage } from '@/features/auth/api/auth-api'
import { RegisterForm } from '@/features/auth/components/register-form'
import { authMutations } from '@/features/auth/queries/auth-mutations'
import type { RegisterFormValues } from '@/features/auth/schemas/register-schema'
import { paths } from '@/config/paths'

function getRedirectTarget(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return paths.workspaces.root.getHref()
  }

  return value
}

export function RegisterPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const mutation = useMutation(authMutations.register())

  const handleSubmit = async (values: RegisterFormValues) => {
    try {
      await mutation.mutateAsync(values)

      await navigate(paths.auth.login.getHref(getRedirectTarget(searchParams.get('redirectTo'))), {
        replace: true,
        state: {
          message: `Account created. You can now sign in as ${values.username}.`,
        },
      })
    } catch {
      // The mutation state renders the error message.
    }
  }

  return (
    <Center mih="100vh" px="md">
      <Container size={420} w="100%">
        <Stack>
          <div>
            <Title order={1}>Create account</Title>
            <Text c="dimmed">Set up your account to get started.</Text>
          </div>

          <Paper withBorder p="xl" radius="md">
            <Stack>
              {mutation.isError && <Alert color="red">{getAuthErrorMessage(mutation.error)}</Alert>}

              <RegisterForm onSubmit={handleSubmit} isSubmitting={mutation.isPending} />

              <Text size="sm" c="dimmed">
                Already have an account?{' '}
                <Anchor component={Link} to={paths.auth.login.getHref()}>
                  Sign in
                </Anchor>
              </Text>
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </Center>
  )
}
