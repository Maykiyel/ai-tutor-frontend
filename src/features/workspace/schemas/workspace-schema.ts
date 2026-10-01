import { z } from 'zod'

/**
 * There is no shared contract for this response. `docs/lesson-schema.json`
 * covers the lesson and the attempt only, so the shape below is the frontend's
 * own guess, derived from the data model in `docs/backend-onboarding.md`. It is
 * a known gap, not an agreement — see "Responses with no shared contract" in
 * the lesson-reader spec. The first divergence gets resolved as a commit to the
 * shared schema file, like every other contract change.
 *
 * Two consequences of it being a guess, both deliberate:
 *
 * - Unknown fields are tolerated. A Zod object drops keys it does not
 *   describe, so a field the backend adds later cannot fail the parse. Never
 *   call `.strict()` here.
 * - `id` accepts a number or a string. The column is a bigint and Laravel may
 *   serialize it either way; the frontend only ever needs it as a path segment,
 *   so it is normalised to a string.
 */
const workspaceIdSchema = z.union([z.string(), z.number()]).transform(String)

export const workspaceSchema = z.object({
  id: workspaceIdSchema,
  topic: z.string().min(1),
})

export const workspaceListSchema = z.array(workspaceSchema)

/**
 * Laravel API resources wrap the payload in `data`, which is the envelope the
 * auth API functions already read. A bare body is accepted as well so the
 * guess costs nothing if the backend skips the wrapper.
 */
export const workspaceResponseSchema = z.union([
  z.object({ data: workspaceSchema }).transform((body) => body.data),
  workspaceSchema,
])

export const workspaceListResponseSchema = z.union([
  z.object({ data: workspaceListSchema }).transform((body) => body.data),
  workspaceListSchema,
])

export type Workspace = z.infer<typeof workspaceSchema>
export type WorkspaceList = z.infer<typeof workspaceListSchema>
