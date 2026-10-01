import { createBrowserRouter } from 'react-router'

import { paths } from '@/config/paths'
import { redirectAuthenticated, requireAuth } from '@/features/auth/middleware/auth-middleware'

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
    // The whole app sits behind auth. Middleware on the layout route runs for
    // every child, including the catch-all, so an unauthenticated deep link
    // lands on /login with a redirectTo back to where it was headed.
    middleware: [requireAuth],
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
