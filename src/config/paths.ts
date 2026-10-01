export const paths = {
  home: {
    path: '/',
    getHref: () => '/',
  },

  workspaces: {
    root: {
      path: '/workspaces',
      getHref: () => '/workspaces',
    },
    create: {
      path: '/workspaces/new',
      getHref: () => '/workspaces/new',
    },
    home: {
      path: '/workspaces/:workspaceId/home',
      getHref: (workspaceId: string) => `/workspaces/${workspaceId}/home`,
    },
    lessons: {
      path: '/workspaces/:workspaceId/lessons',
      getHref: (workspaceId: string) => `/workspaces/${workspaceId}/lessons`,
    },
    records: {
      path: '/workspaces/:workspaceId/learning-records',
      getHref: (workspaceId: string) => `/workspaces/${workspaceId}/learning-records`,
    },
    glossary: {
      path: '/workspaces/:workspaceId/glossary',
      getHref: (workspaceId: string) => `/workspaces/${workspaceId}/glossary`,
    },
    references: {
      path: '/workspaces/:workspaceId/reference-docs',
      getHref: (workspaceId: string) => `/workspaces/${workspaceId}/reference-docs`,
    },
    resources: {
      path: '/workspaces/:workspaceId/resources',
      getHref: (workspaceId: string) => `/workspaces/${workspaceId}/resources`,
    },
    reviews: {
      path: '/workspaces/:workspaceId/reviews',
      getHref: (workspaceId: string) => `/workspaces/${workspaceId}/reviews`,
    },
    settings: {
      path: '/workspaces/:workspaceId/settings',
      getHref: (workspaceId: string) => `/workspaces/${workspaceId}/settings`,
    },
  },

  auth: {
    login: {
      path: '/login',
      getHref: (redirectTo?: string | null) =>
        `/login${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''}`,
    },

    register: {
      path: '/register',
      getHref: () => '/register',
    },
  },
} as const

export const navigation = [
  {
    label: 'Main',
    items: [
      {
        label: 'Workspaces',
        to: paths.workspaces.root.getHref(),
      },
      {
        label: 'New workspace',
        to: paths.workspaces.create.getHref(),
      },
    ],
  },
] as const
