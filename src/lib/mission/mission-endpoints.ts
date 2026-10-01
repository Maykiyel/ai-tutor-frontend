export const missionEndpoints = {
  mission: (workspaceId: string) => `/api/workspaces/${workspaceId}/mission`,
} as const
