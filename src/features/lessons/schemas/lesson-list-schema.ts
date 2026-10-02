import { z } from 'zod'

import { lessonKindSchema } from './lesson-schema'

/**
 * Mirrors `lessonListEntry` in the `$defs` of `docs/lesson-schema.json`, agreed
 * with the backend. The backend orders the list by `number`; the screen sorts it
 * anyway, for the reason given in `lesson-list.tsx`.
 *
 * What is here is exactly what the list screen has to draw, and nothing else:
 *
 * - `id`, because a row links to the reader by id. Normalised to a string so a
 *   bigint column serialised as a number and a string-keyed path param are one
 *   value rather than two.
 * - `number`, because the screen labels a row with it and because it is the
 *   ordinal the waiting state compares against (see `newestLessonNumber`).
 * - `kind`, reused from the lesson schema rather than restated, so the list can
 *   never disagree with the reader about what a hands-on lesson is.
 * - `title`, because the row's link text is the title.
 * - `minutes`, because the row shows the lesson's length. `LESSONS` has no
 *   `minutes` column — it lives in the lesson JSON — so this is the endpoint
 *   projecting `content.minutes` into the row, as agreed.
 *
 * Unknown fields are tolerated on purpose: a Zod object drops keys it does not
 * describe, so `generated_at`, `skill`, `mission_link`, or anything the backend
 * adds later costs nothing and cannot fail the parse. Never call `.strict()`
 * here.
 *
 * The whole list validates or none of it does. Every row is drawn, so a row that
 * cannot be read is not a row to drop quietly — the learner would never learn
 * that a lesson they own has disappeared. A response that fails is an error state
 * with a retry instead, which is the same choice the lesson header makes.
 */
const listEntrySchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  number: z.number().int(),
  kind: lessonKindSchema,
  title: z.string().min(1),
  minutes: z.number().int().min(1),
})

export const lessonListSchema = z.array(listEntrySchema)

/**
 * Laravel wraps API resources in `data`; a bare array is accepted as well,
 * because which one arrives is not agreed and a list that fails to parse over its
 * packaging is a list the learner cannot see.
 */
export const lessonListResponseSchema = z.union([
  z.object({ data: lessonListSchema }).transform((body) => body.data),
  lessonListSchema,
])

export type LessonListEntry = z.infer<typeof listEntrySchema>
export type LessonList = z.infer<typeof lessonListSchema>

/**
 * The highest lesson number in the list, or 0 for a workspace with no lessons.
 *
 * This is the waiting state's whole comparison. A generation is pending until the
 * list holds a lesson numbered higher than the highest one the app had when the
 * learner asked. `number` is the right thing to compare because it is the
 * workspace's own ordinal for a lesson: it needs no clock, no `generated_at`
 * field that only a list endpoint might carry, and no assumption about the order
 * the list arrives in — the maximum is the same whatever the order. A workspace
 * with no lessons reads as 0, so its first lesson clears the wait.
 */
export function newestLessonNumber(lessons: LessonList): number {
  return lessons.reduce((newest, entry) => Math.max(newest, entry.number), 0)
}
