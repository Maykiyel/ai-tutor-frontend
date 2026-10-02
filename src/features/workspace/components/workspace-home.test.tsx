import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Route, Routes } from 'react-router'

import { paths } from '@/config/paths'
import { getMission } from '@/lib/mission/mission-api'
import {
  missionResponse,
  noMissionResponse,
  supersededMissionResponse,
} from '@/lib/mission/mission-fixtures'
import { missionResponseSchema } from '@/lib/mission/mission-schema'
import { renderWithRouter, screen } from '@/test/test-utils'

import { getWorkspace } from '../api/workspace-api'
import { workspaceResponse } from '../fixtures/workspace-fixtures'
import { workspaceResponseSchema } from '../schemas/workspace-schema'
import { WorkspaceHome } from './workspace-home'

vi.mock('../api/workspace-api')
vi.mock('@/lib/mission/mission-api')

const algebra = workspaceResponseSchema.parse(workspaceResponse)
const mission = missionResponseSchema.parse(missionResponse)
const noMission = missionResponseSchema.parse(noMissionResponse)
const supersededMission = missionResponseSchema.parse(supersededMissionResponse)

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
    vi.mocked(getMission).mockReset()
  })

  it('names the topic the learner is working on', async () => {
    vi.mocked(getWorkspace).mockResolvedValue(algebra)
    vi.mocked(getMission).mockResolvedValue(noMission)

    renderHome()

    expect(await screen.findByRole('heading', { name: 'Algebra' })).toBeInTheDocument()
  })

  it('shows the active mission and offers the next lesson', async () => {
    vi.mocked(getWorkspace).mockResolvedValue(algebra)
    vi.mocked(getMission).mockResolvedValue(mission)

    renderHome()

    expect(await screen.findByText('Active mission')).toBeInTheDocument()
    expect(screen.getByText(/pass the placement test in June/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /next lesson/i })).toHaveAttribute(
      'href',
      paths.workspaces.lessons.getHref('7'),
    )
  })

  it('says the next lesson is unavailable because there is no mission, without a dead link', async () => {
    vi.mocked(getWorkspace).mockResolvedValue(algebra)
    vi.mocked(getMission).mockResolvedValue(noMission)

    renderHome()

    expect(await screen.findByText('No active mission')).toBeInTheDocument()

    const nextLesson = screen.getByRole('button', { name: /next lesson/i })

    expect(nextLesson).toBeDisabled()
    expect(nextLesson).toHaveAccessibleDescription(/until this workspace has a mission/i)
    expect(screen.getByText(/a lesson is written to this mission/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /start the mission interview/i })).toHaveAttribute(
      'href',
      paths.workspaces.missionInterview.getHref('7'),
    )
    expect(screen.queryByRole('link', { name: /next lesson/i })).not.toBeInTheDocument()
  })

  it('treats a mission that has been superseded as no mission', async () => {
    vi.mocked(getWorkspace).mockResolvedValue(algebra)
    vi.mocked(getMission).mockResolvedValue(supersededMission)

    renderHome()

    expect(await screen.findByText('No active mission')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /next lesson/i })).toBeDisabled()
    expect(screen.queryByText(/finish the whole textbook/i)).not.toBeInTheDocument()
  })

  it('says it is loading while the mission is on its way', async () => {
    vi.mocked(getWorkspace).mockResolvedValue(algebra)
    vi.mocked(getMission).mockReturnValue(new Promise(() => {}))

    renderHome()

    expect(await screen.findByText('Loading this mission...')).toBeInTheDocument()
  })

  it('offers a retry when the mission does not load, and the retry loads it', async () => {
    const user = userEvent.setup()
    vi.mocked(getWorkspace).mockResolvedValue(algebra)
    vi.mocked(getMission)
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValue(mission)

    renderHome()

    expect(await screen.findByText('This mission could not be loaded')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Active mission')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /next lesson/i })).toBeInTheDocument()
  })

  it('offers a retry when the workspace does not load, and the retry loads it', async () => {
    const user = userEvent.setup()
    vi.mocked(getWorkspace)
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValue(algebra)
    vi.mocked(getMission).mockResolvedValue(mission)

    renderHome()

    expect(await screen.findByText('This workspace could not be loaded')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('heading', { name: 'Algebra' })).toBeInTheDocument()
  })
})
