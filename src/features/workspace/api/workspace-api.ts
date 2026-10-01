import { apiClient } from '@/lib/api/client'

import {
  workspaceListResponseSchema,
  workspaceResponseSchema,
  type Workspace,
  type WorkspaceList,
} from '../schemas/workspace-schema'
import { workspaceEndpoints } from './workspace-endpoints'

export type CreateWorkspaceInput = {
  topic: string
}

export async function listWorkspaces(): Promise<WorkspaceList> {
  const response = await apiClient.get(workspaceEndpoints.root)

  return workspaceListResponseSchema.parse(response.data)
}

export async function getWorkspace(workspaceId: string): Promise<Workspace> {
  const response = await apiClient.get(workspaceEndpoints.byId(workspaceId))

  return workspaceResponseSchema.parse(response.data)
}

/**
 * Only the topic is sent. Teaching notes and the community opt-out live on
 * `PATCH /api/workspaces/{id}`, which the backend developer has explicitly not
 * agreed, so the app must not offer a field with nowhere to save.
 */
export async function createWorkspace(input: CreateWorkspaceInput): Promise<Workspace> {
  const response = await apiClient.post(workspaceEndpoints.root, input)

  return workspaceResponseSchema.parse(response.data)
}
