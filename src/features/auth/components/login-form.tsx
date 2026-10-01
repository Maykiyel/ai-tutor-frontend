import { zodResolver } from '@hookform/resolvers/zod'
import { Button, PasswordInput, Stack, TextInput } from '@mantine/core'
import { useForm } from 'react-hook-form'

import { loginSchema, type LoginFormValues } from '../schemas/login-schema'

type LoginFormProps = {
  onSubmit: (values: LoginFormValues) => void | Promise<void>
  isSubmitting?: boolean
}

export function LoginForm({ onSubmit, isSubmitting = false }: LoginFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
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
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />

        <Button type="submit" loading={isSubmitting}>
          Sign in
        </Button>
      </Stack>
    </form>
  )
}
