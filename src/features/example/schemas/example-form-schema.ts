import { z } from 'zod'

export const exampleFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
})

export type ExampleFormValues = z.infer<typeof exampleFormSchema>
