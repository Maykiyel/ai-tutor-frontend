import { createBrowserRouter, type RouteObject } from 'react-router'

import { paths } from '@/config/paths'
import { redirectAuthenticated, requireAuth } from '@/features/auth/middleware/auth-middleware'

import App from './app.tsx'
import { RootErrorBoundary } from './error-boundary.tsx'
import { homeRedirect } from './routes/home.tsx'
import { LoginPage } from './routes/login.tsx'
import { NotFoundPage } from './routes/not-found.tsx'
import { RegisterPage } from './routes/register.tsx'
import { CreateWorkspacePage } from './routes/workspace-create.tsx'
import { WorkspaceGlossaryPage } from './routes/workspace-glossary.tsx'
import { WorkspaceHomePage } from './routes/workspace-home.tsx'
import { WorkspaceLessonPage } from './routes/workspace-lesson.tsx'
import { WorkspaceLessonsPage } from './routes/workspace-lessons.tsx'
import { WorkspaceMissionInterviewPage } from './routes/workspace-mission-interview.tsx'
import { WorkspaceRecordsPage } from './routes/workspace-records.tsx'
import { WorkspaceReferenceDocPage } from './routes/workspace-reference-doc.tsx'
import { WorkspaceReferencesPage } from './routes/workspace-references.tsx'
import { WorkspaceResourcesPage } from './routes/workspace-resources.tsx'
import { WorkspaceReviewsPage } from './routes/workspace-reviews.tsx'
import { WorkspaceSettingsPage } from './routes/workspace-settings.tsx'
import { WorkspaceListPage } from './routes/workspaces.tsx'

// Exported so a test can build a memory router from the real configuration
// rather than a copy of it. Keep it the single source of routes.
export const routes: RouteObject[] = [
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
    // Pathless, so the whole app sits behind auth while every screen below can
    // carry its own absolute path. Middleware on this route runs for every
    // child, including the catch-all, so an unauthenticated deep link lands on
    // /login with a redirectTo back to where it was headed.
    Component: App,
    ErrorBoundary: RootErrorBoundary,
    middleware: [requireAuth],
    children: [
      {
        index: true,
        loader: homeRedirect,
      },
      {
        path: paths.workspaces.root.path,
        Component: WorkspaceListPage,
      },
      {
        path: paths.workspaces.create.path,
        Component: CreateWorkspacePage,
      },
      {
        path: paths.workspaces.home.path,
        Component: WorkspaceHomePage,
      },
      {
        path: paths.workspaces.missionInterview.path,
        Component: WorkspaceMissionInterviewPage,
      },
      {
        path: paths.workspaces.lessons.path,
        Component: WorkspaceLessonsPage,
      },
      // The reader, by deep link. Declared before the lessons path it nests
      // under so a lesson id resolves here rather than falling through.
      {
        path: paths.workspaces.lessonDetail.path,
        Component: WorkspaceLessonPage,
      },
      // Declared because the path config declares them and the sidebar offers
      // them. Each renders an honest "not built yet" screen rather than a 404:
      // a link that goes nowhere is worse than a screen that says so.
      {
        path: paths.workspaces.records.path,
        Component: WorkspaceRecordsPage,
      },
      {
        path: paths.workspaces.glossary.path,
        Component: WorkspaceGlossaryPage,
      },
      {
        path: paths.workspaces.references.path,
        Component: WorkspaceReferencesPage,
      },
      // The destination a lesson's `link` segment builds from the path config.
      {
        path: paths.workspaces.referenceDocDetail.path,
        Component: WorkspaceReferenceDocPage,
      },
      {
        path: paths.workspaces.resources.path,
        Component: WorkspaceResourcesPage,
      },
      {
        path: paths.workspaces.reviews.path,
        Component: WorkspaceReviewsPage,
      },
      {
        path: paths.workspaces.settings.path,
        Component: WorkspaceSettingsPage,
      },
      {
        path: '*',
        Component: NotFoundPage,
      },
    ],
  },
]

export const router = createBrowserRouter(routes)
