import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Button, Group, Stack, Text, TextInput, Title } from '@mantine/core'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'

import { paths } from '@/config/paths'

import { workspaceMutations } from '../queries/workspace-mutations'
import { workspaceKeys } from '../queries/workspace-queries'
import {
  createWorkspaceSchema,
  type CreateWorkspaceFormValues,
} from '../schemas/create-workspace-schema'

export function CreateWorkspace() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const mutation = useMutation({
    ...workspaceMutations.create(),
    onSuccess: () => {
      // The learner lands back on the list, where the workspace they just named
      // is now one of the cards they can open. The cached list is dropped
      // rather than patched by hand.
      void queryClient.invalidateQueries({ queryKey: workspaceKeys.list() })
      void navigate(paths.workspaces.root.getHref(), { replace: true })
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateWorkspaceFormValues>({
    resolver: zodResolver(createWorkspaceSchema),
    defaultValues: { topic: '' },
  })

  return (
    <Stack gap="lg" py="xl" maw={480}>
      <div>
        <Title order={1}>New workspace</Title>
        <Text c="dimmed">Name the topic you want to learn.</Text>
      </div>

      <form onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
        <Stack>
          {mutation.isError ? (
            <Alert color="red" role="alert">
              Your workspace could not be created. Your topic is still here, so you can try again.
            </Alert>
          ) : null}

          <TextInput
            label="Topic"
            description="What do you want to be able to do?"
            autoComplete="off"
            error={errors.topic?.message}
            {...register('topic')}
          />

          <Group>
            <Button type="submit" loading={mutation.isPending}>
              Create workspace
            </Button>

            <Button
              component={Link}
              to={paths.workspaces.root.getHref()}
              variant="subtle"
              color="gray"
            >
              Cancel
            </Button>
          </Group>
        </Stack>
      </form>
    </Stack>
  )
}
