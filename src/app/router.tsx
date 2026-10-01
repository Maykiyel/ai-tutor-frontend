import { createBrowserRouter } from 'react-router'

import { paths } from '@/config/paths'
import { redirectAuthenticated } from '@/features/auth/middleware/auth-middleware'

import App from './app.tsx'
import { RootErrorBoundary } from './error-boundary.tsx'
import { HomePage } from './routes/home.tsx'
import { LoginPage } from './routes/login.tsx'
import { NotFoundPage } from './routes/not-found.tsx'
import { RegisterPage } from './routes/register.tsx'

export const router = createBrowserRouter([
  // Auth routes sit outside the AppShell: they render their own full-screen
  // layout. Declared before the catch-all so they are not matched by it.
  {
    path: paths.auth.login.path,
    Component: LoginPage,
    middleware: [redirectAuthenticated],
  },
  {
    path: paths.auth.register.path,
    Component: RegisterPage,
    middleware: [redirectAuthenticated],
  },
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
