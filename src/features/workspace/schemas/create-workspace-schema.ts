import { z } from 'zod'

/**
 * The topic is the only field. `notes` and `communities_opt_out` exist in the
 * data model, but they are saved through `PATCH /api/workspaces/{id}`, which the
 * backend developer has explicitly not agreed, so this form does not offer a
 * field with nowhere to save.
 */
export const createWorkspaceSchema = z.object({
  topic: z.string().trim().min(1, 'Enter a topic'),
})

export type CreateWorkspaceFormValues = z.infer<typeof createWorkspaceSchema>
