export const lessonEndpoints = {
  byId: (lessonId: string) => `/api/lessons/${lessonId}`,
  attempts: (lessonId: string) => `/api/lessons/${lessonId}/attempts`,
  listForWorkspace: (workspaceId: string) => `/api/workspaces/${workspaceId}/lessons`,
  nextForWorkspace: (workspaceId: string) => `/api/workspaces/${workspaceId}/lessons/next`,
} as const
