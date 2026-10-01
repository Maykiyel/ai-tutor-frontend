import { z } from 'zod'

/**
 * There is no shared contract for this response either. `docs/lesson-schema.json`
 * covers the lesson and the attempt only, so the shape below is the frontend's
 * own guess, derived from the data model and the guarantees in
 * `docs/backend-onboarding.md`. It is a known gap, not an agreement — see
 * "Responses with no shared contract" in the lesson-reader spec, and the same
 * reasoning as `workspace-schema.ts`. The first divergence gets resolved as a
 * commit to a shared schema file, not as a conversation.
 *
 * Two consequences of it being a guess, both deliberate:
 *
 * - Unknown fields are tolerated. A Zod object drops keys it does not describe,
 *   so the rest of the mission (`success_criteria`, `constraints`,
 *   `out_of_scope`, a revision number) costs nothing and a field the backend
 *   adds later cannot fail the parse. Never call `.strict()` here.
 * - `id` accepts a number or a string, like workspace ids: the column is a
 *   bigint and Laravel may serialize it either way.
 *
 * Only the fields the workspace home screen needs are described. `why` is the
 * one mission text the screen shows; `is_active` is the field that decides
 * whether a lesson can be asked for, because missions are revisions with
 * exactly one active per workspace (GLOSSARY.md, `docs/backend-onboarding.md`).
 * A mission the backend considers superseded is therefore not a mission to
 * this screen, however recent it looks.
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
