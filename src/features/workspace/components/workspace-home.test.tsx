import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Route, Routes } from 'react-router'

import { paths } from '@/config/paths'
import { renderWithRouter, screen } from '@/test/test-utils'

import { getWorkspace } from '../api/workspace-api'
import { workspaceResponse } from '../fixtures/workspace-fixtures'
import { workspaceResponseSchema } from '../schemas/workspace-schema'
import { WorkspaceHome } from './workspace-home'

vi.mock('../api/workspace-api')

const algebra = workspaceResponseSchema.parse(workspaceResponse)

function renderHome(workspaceId = '7') {
  return renderWithRouter(
    <Routes>
      <Route path={paths.workspaces.home.path} element={<WorkspaceHome />} />
    </Routes>,
    [paths.workspaces.home.getHref(workspaceId)],
  )
}

describe('WorkspaceHome', () => {
  beforeEach(() => {
    vi.mocked(getWorkspace).mockReset()
  })

  it('names the topic the learner is working on', async () => {
    vi.mocked(getWorkspace).mockResolvedValue(algebra)

    renderHome()

    expect(await screen.findByRole('heading', { name: 'Algebra' })).toBeInTheDocument()
  })

  it('says the next lesson is unavailable because there is no mission, without a dead link', async () => {
    vi.mocked(getWorkspace).mockResolvedValue(algebra)

    renderHome()

    const nextLesson = await screen.findByRole('button', { name: /next lesson/i })

    expect(nextLesson).toBeDisabled()
    expect(nextLesson).toHaveAccessibleDescription(/until this workspace has a mission/i)
    expect(screen.getByText(/mission interview is not built yet/i)).toBeInTheDocument()
    // A link would send the learner somewhere that is not built.
    expect(screen.queryByRole('link', { name: /next lesson/i })).not.toBeInTheDocument()
  })

  it('offers a retry when the workspace does not load, and the retry loads it', async () => {
    const user = userEvent.setup()
    vi.mocked(getWorkspace)
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValue(algebra)

    renderHome()

    expect(await screen.findByText('This workspace could not be loaded')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('heading', { name: 'Algebra' })).toBeInTheDocument()
  })
})
