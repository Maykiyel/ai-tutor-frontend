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
    lessonDetail: {
      path: '/workspaces/:workspaceId/lessons/:lessonId',
      getHref: (workspaceId: string, lessonId: string) =>
        `/workspaces/${workspaceId}/lessons/${lessonId}`,
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

export type NavItem = {
  label: string
  to: string
}

export type NavSection = {
  label: string
  items: NavItem[]
}

/** The sections that are not inside a workspace. */
export const appNavigation: NavSection[] = [
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
]

/**
 * A workspace is one topic, so every screen below belongs to the workspace in
 * the path — see GLOSSARY.md. The sections are built from that id rather than
 * declared once, which is what keeps the sidebar honest about where the learner
 * is. Urls still come from `paths` above; none is written by hand.
 */
export function getWorkspaceNavigation(workspaceId: string): NavSection[] {
  return [
    {
      label: 'Workspace',
      items: [
        { label: 'Home', to: paths.workspaces.home.getHref(workspaceId) },
        { label: 'Lessons', to: paths.workspaces.lessons.getHref(workspaceId) },
        { label: 'Learning records', to: paths.workspaces.records.getHref(workspaceId) },
        { label: 'Glossary', to: paths.workspaces.glossary.getHref(workspaceId) },
        { label: 'Reference docs', to: paths.workspaces.references.getHref(workspaceId) },
        // The domain word is Source; the table and the path are `resources`.
        { label: 'Sources', to: paths.workspaces.resources.getHref(workspaceId) },
        { label: 'Reviews', to: paths.workspaces.reviews.getHref(workspaceId) },
        { label: 'Settings', to: paths.workspaces.settings.getHref(workspaceId) },
      ],
    },
  ]
}
