import { z } from 'zod'

/**
 * Mirrors `workspace` in the `$defs` of `docs/lesson-schema.json`, agreed with
 * the backend. Only the fields these screens use are described.
 *
 * Two tolerances, both deliberate, kept from when the shape was a guess:
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
