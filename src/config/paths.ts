export const paths = {
  home: {
    path: '/',
    getHref: () => '/',
  },

  dashboard: {
    path: '/dashboard',
    getHref: () => '/dashboard',
  },

  features: {
    root: {
      path: '/features',
      getHref: () => '/features',
    },
    new: {
      path: '/features/new',
      getHref: () => '/features/new',
    },
  },

  activity: {
    path: '/activity',
    getHref: () => '/activity',
  },

  settings: {
    path: '/settings',
    getHref: () => '/settings',
  },
} as const

export const navigation = [
  {
    label: 'Main',
    items: [
      {
        label: 'Home',
        to: paths.home.getHref(),
      },
      {
        label: 'Dashboard',
        to: paths.dashboard.getHref(),
      },
    ],
  },
  {
    label: 'Workspace',
    items: [
      {
        label: 'Features',
        children: [
          {
            label: 'All features',
            to: paths.features.root.getHref(),
          },
          {
            label: 'New feature',
            to: paths.features.new.getHref(),
          },
        ],
      },
      {
        label: 'Activity',
        to: paths.activity.getHref(),
      },
    ],
  },
  {
    label: 'System',
    items: [
      {
        label: 'Settings',
        to: paths.settings.getHref(),
      },
    ],
  },
] as const
