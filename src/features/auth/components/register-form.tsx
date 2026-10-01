import { zodResolver } from '@hookform/resolvers/zod'
import { Button, PasswordInput, Stack, TextInput } from '@mantine/core'
import { useForm } from 'react-hook-form'

import { registerSchema, type RegisterFormValues } from '../schemas/register-schema'

type RegisterFormProps = {
  onSubmit: (values: RegisterFormValues) => void | Promise<void>
  isSubmitting?: boolean
}

export function RegisterForm({ onSubmit, isSubmitting = false }: RegisterFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      password: '',
      password_confirmation: '',
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <Stack>
        <TextInput
          label="Username"
          autoComplete="username"
          error={errors.username?.message}
          {...register('username')}
        />

        <PasswordInput
          label="Password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />

        <PasswordInput
          label="Confirm password"
          autoComplete="new-password"
          error={errors.password_confirmation?.message}
          {...register('password_confirmation')}
        />

        <Button type="submit" loading={isSubmitting}>
          Create account
        </Button>
      </Stack>
    </form>
  )
}
