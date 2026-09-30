import { createBrowserRouter } from 'react-router'

import { paths } from '@/config/paths'

import App from './app.tsx'
import { RootErrorBoundary } from './error-boundary.tsx'
import { HomePage } from './routes/home.tsx'
import { NotFoundPage } from './routes/not-found.tsx'

export const router = createBrowserRouter([
  {
    path: paths.home.path,
    Component: App,
    ErrorBoundary: RootErrorBoundary,
    children: [
      {
        index: true,
        Component: HomePage,
      },
      {
        path: '*',
        Component: NotFoundPage,
      },
    ],
  },
])
