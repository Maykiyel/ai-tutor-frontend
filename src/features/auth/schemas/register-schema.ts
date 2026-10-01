import { z } from 'zod'

export const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(50, 'Username must be at most 50 characters'),
    password: z.string().min(5, 'Password must be at least 5 characters'),
    password_confirmation: z.string().min(1, 'Please confirm your password'),
  })
  .refine((values) => values.password === values.password_confirmation, {
    path: ['password_confirmation'],
    message: 'Passwords do not match',
  })

export type RegisterFormValues = z.infer<typeof registerSchema>
