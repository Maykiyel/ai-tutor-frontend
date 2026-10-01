import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithRouter, screen } from '@/test/test-utils'

import { listWorkspaces } from '../api/workspace-api'
import { emptyWorkspacesResponse, workspacesResponse } from '../fixtures/workspace-fixtures'
import { workspaceListResponseSchema } from '../schemas/workspace-schema'
import { WorkspaceList } from './workspace-list'

// The API module is the seam: the screen never sees HTTP, only what this
// feature's own API functions resolve to. The real schema parses the fixture,
// so a response carrying fields the schema does not describe is exercised
// exactly as the backend would exercise it.
vi.mock('../api/workspace-api')

const workspaces = workspaceListResponseSchema.parse(workspacesResponse)
const noWorkspaces = workspaceListResponseSchema.parse(emptyWorkspacesResponse)

describe('WorkspaceList', () => {
  beforeEach(() => {
    vi.mocked(listWorkspaces).mockReset()
  })

  it('shows the topic of every workspace', async () => {
    vi.mocked(listWorkspaces).mockResolvedValue(workspaces)

    renderWithRouter(<WorkspaceList />)

    expect(await screen.findByRole('link', { name: /Algebra/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Kanji/ })).toBeInTheDocument()
  })

  it('explains what a workspace is and offers to create one when there is none', async () => {
    vi.mocked(listWorkspaces).mockResolvedValue(noWorkspaces)

    renderWithRouter(<WorkspaceList />)

    expect(await screen.findByText(/one topic/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create your first workspace' })).toHaveAttribute(
      'href',
      '/workspaces/new',
    )
  })

  it('says it is loading while the list is on its way', () => {
    vi.mocked(listWorkspaces).mockReturnValue(new Promise(() => {}))

    renderWithRouter(<WorkspaceList />)

    expect(screen.getByText('Loading your workspaces...')).toBeInTheDocument()
  })

  it('offers a retry when the list fails, and the retry loads it', async () => {
    const user = userEvent.setup()
    vi.mocked(listWorkspaces)
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValue(workspaces)

    renderWithRouter(<WorkspaceList />)

    expect(await screen.findByText('Your workspaces could not be loaded')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('link', { name: /Algebra/ })).toBeInTheDocument()
  })

  it('still lists a workspace when the response carries fields the schema does not describe', async () => {
    vi.mocked(listWorkspaces).mockResolvedValue(
      workspaceListResponseSchema.parse({
        data: [{ id: 12, topic: 'Bird calls', lesson_count: 4, latest_lesson_at: '2026-09-01' }],
      }),
    )

    renderWithRouter(<WorkspaceList />)

    expect(await screen.findByRole('link', { name: /Bird calls/ })).toHaveAttribute(
      'href',
      '/workspaces/12/home',
    )
  })
})
