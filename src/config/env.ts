import * as z from 'zod'

const envSchema = z.object({
  API_URL: z.union([z.url(), z.string().startsWith('/')]).default('/api'),
})

const parsedEnv = envSchema.safeParse({
  API_URL: import.meta.env.VITE_API_URL,
})

if (!parsedEnv.success) {
  const errors = Object.entries(parsedEnv.error.flatten().fieldErrors)
    .map(([key, messages]) => `- ${key}: ${messages?.join(', ')}`)
    .join('\n')

  throw new Error(`Invalid environment variables:\n${errors}`)
}

export const env = Object.freeze(parsedEnv.data)
