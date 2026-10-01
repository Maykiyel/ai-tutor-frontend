import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Stack, TextInput } from '@mantine/core'
import { useForm } from 'react-hook-form'

import { exampleFormSchema, type ExampleFormValues } from '../schemas/example-form-schema'

type ExampleFormProps = {
  onSubmit: (values: ExampleFormValues) => void | Promise<void>
}

export function ExampleForm({ onSubmit }: ExampleFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ExampleFormValues>({
    resolver: zodResolver(exampleFormSchema),
    defaultValues: {
      name: '',
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <Stack>
        <TextInput
          label="Name"
          placeholder="Example item"
          error={errors.name?.message}
          {...register('name')}
        />

        <Button type="submit" loading={isSubmitting}>
          Submit
        </Button>
      </Stack>
    </form>
  )
}
