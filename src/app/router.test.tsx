import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router'

import { getWorkspaceNavigation, paths } from '@/config/paths'
import { login } from '@/features/auth/api/auth-api'
import { useAuthStore } from '@/features/auth/store'
import type { User } from '@/features/auth/types'
import { getWorkspace, listWorkspaces } from '@/features/workspace/api/workspace-api'
import {
  workspaceResponse,
  workspacesResponse,
} from '@/features/workspace/fixtures/workspace-fixtures'
import {
  workspaceListResponseSchema,
  workspaceResponseSchema,
} from '@/features/workspace/schemas/workspace-schema'
import { renderWithProviders, screen, waitFor, within } from '@/test/test-utils'

import { routes } from './router'

// The seam for a routed screen is the same one every screen uses: the API
// modules are stubbed with fixture responses and everything above them — router,
// middleware, shell, screens — is the real thing.
vi.mock('@/features/auth/api/auth-api')
vi.mock('@/features/workspace/api/workspace-api')

const user: User = { username: 'ada', email: 'ada@example.com' }
const workspaces = workspaceListResponseSchema.parse(workspacesResponse)
const algebra = workspaceResponseSchema.parse(workspaceResponse)

const everyWorkspaceHref = [
  paths.workspaces.root.getHref(),
  paths.workspaces.create.getHref(),
  ...getWorkspaceNavigation('7').flatMap((section) => section.items.map((item) => item.to)),
]

function signIn() {
  useAuthStore.setState({ user, token: 'a-token', role: null })
}

function renderAt(href: string) {
  const router = createMemoryRouter(routes, { initialEntries: [href] })

  return renderWithProviders(<RouterProvider router={router} />)
}

describe('router', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.setState({ user: null, token: null, role: null })
    vi.mocked(listWorkspaces).mockResolvedValue(workspaces)
    vi.mocked(getWorkspace).mockImplementation(async (workspaceId: string) => ({
      ...algebra,
      id: workspaceId,
    }))
  })

  it('sends a signed-in learner from the app root to the workspace list', async () => {
    signIn()

    renderAt(paths.home.getHref())

    expect(await screen.findByRole('heading', { name: 'Your workspaces' })).toBeInTheDocument()
  })

  it.each(everyWorkspaceHref)('resolves %s to a screen of its own, not a 404', async (href) => {
    signIn()

    renderAt(href)

    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Page not found' })).not.toBeInTheDocument()
  })

  it('brings the learner back to the workspace screen they linked to after signing in', async () => {
    const learner = userEvent.setup()
    vi.mocked(login).mockResolvedValue({ user, token: 'a-token', role: null })

    renderAt(paths.workspaces.home.getHref('7'))

    await learner.type(await screen.findByLabelText('Username'), 'ada')
    await learner.type(screen.getByLabelText('Password'), 'secret123')
    await learner.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('heading', { name: 'Algebra' })).toBeInTheDocument()
    // The exact screen, not just the workspace: the sidebar marks where they are.
    const sidebar = await screen.findByRole('navigation')
    expect(within(sidebar).getByRole('link', { name: 'Home' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('shows the sections of the workspace named in the path', async () => {
    signIn()

    renderAt(paths.workspaces.lessons.getHref('9'))

    const sidebar = await screen.findByRole('navigation')

    expect(await within(sidebar).findByRole('link', { name: 'Glossary' })).toHaveAttribute(
      'href',
      '/workspaces/9/glossary',
    )
  })

  it('shows the sections that are not inside a workspace outside a workspace', async () => {
    signIn()

    renderAt(paths.workspaces.root.getHref())

    const sidebar = await screen.findByRole('navigation')

    expect(await within(sidebar).findByRole('link', { name: 'Workspaces' })).toBeInTheDocument()
    expect(within(sidebar).queryByRole('link', { name: 'Glossary' })).not.toBeInTheDocument()
  })

  it('switches workspace from the header, and the sidebar follows', async () => {
    const learner = userEvent.setup()
    signIn()

    renderAt(paths.workspaces.home.getHref('7'))

    const header = await screen.findByRole('banner')
    const sidebar = screen.getByRole('navigation')

    await waitFor(() =>
      expect(within(header).getByRole('button', { name: /Algebra/ })).toBeInTheDocument(),
    )

    await learner.click(within(header).getByRole('button', { name: /Algebra/ }))
    await learner.click(await screen.findByRole('menuitem', { name: 'Kanji' }))

    expect(await within(sidebar).findByRole('button', { name: /Kanji/ })).toBeInTheDocument()
    expect(within(sidebar).getByRole('link', { name: 'Glossary' })).toHaveAttribute(
      'href',
      '/workspaces/9/glossary',
    )
  })

  it('switches workspace from the sidebar', async () => {
    const learner = userEvent.setup()
    signIn()

    renderAt(paths.workspaces.home.getHref('7'))

    const sidebar = await screen.findByRole('navigation')

    await learner.click(await within(sidebar).findByRole('button', { name: /Algebra/ }))
    await learner.click(await screen.findByRole('menuitem', { name: 'Kanji' }))

    expect(await within(sidebar).findByRole('button', { name: /Kanji/ })).toBeInTheDocument()
    expect(within(sidebar).getByRole('link', { name: 'Glossary' })).toHaveAttribute(
      'href',
      '/workspaces/9/glossary',
    )
  })
})
