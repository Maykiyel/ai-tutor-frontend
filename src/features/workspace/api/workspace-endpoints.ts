export const workspaceEndpoints = {
  root: '/api/workspaces',
  byId: (workspaceId: string) => `/api/workspaces/${workspaceId}`,
} as const
