import { z } from 'zod'

/**
 * This lives in `src/lib` rather than in either feature because two features now
 * need it: the workspace home shows the mission, and the lesson list has to know
 * whether a lesson can be asked for before it offers to ask. Features do not
 * import from one another, so the shared read is promoted rather than reached into.
 *
 * Mirrors `mission` in the `$defs` of `docs/lesson-schema.json`, agreed with the
 * backend. A workspace with no active mission answers 200 with `data: null`.
 *
 * Two tolerances, both deliberate, kept from when the shape was a guess:
 *
 * - Unknown fields are tolerated. A Zod object drops keys it does not describe,
 *   so the rest of the mission (`success_criteria`, `constraints`,
 *   `out_of_scope`, a revision number) costs nothing and a field the backend
 *   adds later cannot fail the parse. Never call `.strict()` here.
 * - `id` accepts a number or a string, like workspace ids: the column is a
 *   bigint and Laravel may serialize it either way.
 *
 * Only the fields these screens need are described. `why` is the one mission
 * text a screen shows; `is_active` is the field that decides
 * whether a lesson can be asked for, because missions are revisions with
 * exactly one active per workspace (GLOSSARY.md, `docs/backend-onboarding.md`).
 * A mission the backend considers superseded is therefore not a mission to
 * these screens, however recent it looks.
 */
const missionIdSchema = z.union([z.string(), z.number()]).transform(String)

export const missionSchema = z.object({
  id: missionIdSchema,
  why: z.string().min(1),
  is_active: z.boolean(),
})

/**
 * A workspace with no mission is an ordinary state, not a failure, so an absent
 * mission parses to null and the screen can explain the gate instead of showing
 * an error. The Laravel `data` envelope and a bare body are both accepted, for
 * the same reason the workspace schemas accept both.
 */
export const missionResponseSchema = z.union([
  z.object({ data: missionSchema.nullable() }).transform((body) => body.data),
  missionSchema,
  z.null(),
])

export type Mission = z.infer<typeof missionSchema>
