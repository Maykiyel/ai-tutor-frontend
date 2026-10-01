export const workspaceEndpoints = {
  root: '/api/workspaces',
  byId: (workspaceId: string) => `/api/workspaces/${workspaceId}`,
  mission: (workspaceId: string) => `/api/workspaces/${workspaceId}/mission`,
} as const
