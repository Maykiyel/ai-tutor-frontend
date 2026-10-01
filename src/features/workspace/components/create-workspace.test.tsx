import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Route, Routes } from 'react-router'

import { paths } from '@/config/paths'
import { renderWithRouter, screen } from '@/test/test-utils'

import { createWorkspace, listWorkspaces } from '../api/workspace-api'
import { workspacesResponse } from '../fixtures/workspace-fixtures'
import { workspaceListResponseSchema, type Workspace } from '../schemas/workspace-schema'
import { CreateWorkspace } from './create-workspace'
import { WorkspaceList } from './workspace-list'

vi.mock('../api/workspace-api')

const algebra = workspaceListResponseSchema.parse(workspacesResponse)[0]

let existing: Workspace[] = []

function stubApi() {
  vi.mocked(listWorkspaces).mockImplementation(async () => existing)
  vi.mocked(createWorkspace).mockImplementation(async (input) => {
    const created: Workspace = { id: '11', topic: input.topic }
    existing = [...existing, created]

    return created
  })
}

function renderCreateJourney() {
  return renderWithRouter(
    <Routes>
      <Route path={paths.workspaces.create.path} element={<CreateWorkspace />} />
      <Route path={paths.workspaces.root.path} element={<WorkspaceList />} />
    </Routes>,
    [paths.workspaces.create.getHref()],
  )
}

describe('CreateWorkspace', () => {
  beforeEach(() => {
    existing = []
    stubApi()
  })

  it('asks for a topic and nothing else', () => {
    renderCreateJourney()

    expect(screen.getByLabelText('Topic')).toBeInTheDocument()
    // Teaching notes and the community opt-out have no agreed endpoint, so the
    // form must not offer a field with nowhere to save.
    expect(screen.getAllByRole('textbox')).toHaveLength(1)
    expect(screen.queryByText(/notes/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/communit/i)).not.toBeInTheDocument()
  })

  it('refuses an empty topic without leaving the form', async () => {
    const user = userEvent.setup()

    renderCreateJourney()

    await user.click(screen.getByRole('button', { name: 'Create workspace' }))

    expect(screen.getByText('Enter a topic')).toBeInTheDocument()
    expect(screen.getByLabelText('Topic')).toBeInTheDocument()
    expect(createWorkspace).not.toHaveBeenCalled()
  })

  it('creates the workspace and shows it in the list', async () => {
    const user = userEvent.setup()
    existing = [algebra]
    renderCreateJourney()

    await user.type(screen.getByLabelText('Topic'), 'Kanji')
    await user.click(screen.getByRole('button', { name: 'Create workspace' }))

    expect(await screen.findByRole('heading', { name: 'Your workspaces' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: /Kanji/ })).toHaveAttribute(
      'href',
      '/workspaces/11/home',
    )
  })

  it('keeps the topic and explains the failure when creating does not work', async () => {
    const user = userEvent.setup()
    vi.mocked(createWorkspace).mockRejectedValue(new Error('server said no'))
    renderCreateJourney()

    await user.type(screen.getByLabelText('Topic'), 'Kanji')
    await user.click(screen.getByRole('button', { name: 'Create workspace' }))

    expect(await screen.findByText(/could not be created/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Topic')).toHaveValue('Kanji')
  })
})
