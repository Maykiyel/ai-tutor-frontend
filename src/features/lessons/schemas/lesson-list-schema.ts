import { z } from 'zod'

/**
 * The lesson *list* response has no shared contract. `docs/lesson-schema.json`
 * covers the lesson and the attempt only, so this is the frontend's own guess,
 * derived from the endpoint list in `docs/backend-onboarding.md`. It is a known
 * gap, not an agreement, and the first divergence gets resolved as a commit to
 * the shared schema file like every other contract change.
 *
 * Unknown fields are tolerated on purpose: a Zod object drops keys it does not
 * describe, so a field the backend adds later cannot fail the parse. Never call
 * `.strict()` here.
 */
const listEntrySchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  number: z.number().int(),
  kind: z.enum(['concept', 'hands-on', 'review']),
  title: z.string().min(1),
  minutes: z.number().int(),
})

export const lessonListSchema = z.array(listEntrySchema)

export const lessonListResponseSchema = z.union([
  z.object({ data: lessonListSchema }).transform((body) => body.data),
  lessonListSchema,
])

export type LessonListEntry = z.infer<typeof listEntrySchema>
export type LessonList = z.infer<typeof lessonListSchema>
