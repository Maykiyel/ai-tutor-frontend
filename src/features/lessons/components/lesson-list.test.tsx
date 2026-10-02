import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Route, Routes } from 'react-router'

import { paths } from '@/config/paths'
import { getMission } from '@/lib/mission/mission-api'
import { missionResponse, noMissionResponse } from '@/lib/mission/mission-fixtures'
import { missionResponseSchema } from '@/lib/mission/mission-schema'
import { fireEvent, renderWithRouter, screen, waitFor } from '@/test/test-utils'

import { getLesson, listLessons, requestNextLesson } from '../api/lesson-api'
import { conceptFixture } from '../fixtures/lesson-fixtures'
import {
  emptyLessonListResponse,
  lessonListResponse,
  lessonListResponseWithNewLesson,
} from '../fixtures/lesson-list-fixtures'
import { noActiveMissionError } from '../fixtures/http-error-fixtures'
import {
  LESSON_GENERATION_TIMEOUT_MS,
  LESSON_LIST_POLL_INTERVAL_MS,
  usePendingGenerationStore,
} from '../pending-generation-store'
import { lessonListResponseSchema } from '../schemas/lesson-list-schema'
import { LessonList } from './lesson-list'
import { LessonReader } from './lesson-reader'

vi.mock('../api/lesson-api')
vi.mock('@/lib/mission/mission-api')

const WORKSPACE_ID = '7'

/**
 * The wire response is parsed by the feature's own schema before it reaches the
 * stub, so the stub returns what the backend would send rather than what the
 * screen wants to receive. `lessonListResponse` carries a `generated_at` on every
 * row: fields the schema does not describe must not cost the learner the list.
 */
const lessons = lessonListResponseSchema.parse(lessonListResponse)
const noLessons = lessonListResponseSchema.parse(emptyLessonListResponse)
const lessonsWithNewLesson = lessonListResponseSchema.parse(lessonListResponseWithNewLesson)
const mission = missionResponseSchema.parse(missionResponse)
const noMission = missionResponseSchema.parse(noMissionResponse)

/**
 * The list and the reader as one journey, because "the learner can reach a
 * lesson" and "the waiting state is not lost when they leave" are both claims
 * about the two screens together rather than about either alone.
 */
function renderJourney() {
  return renderWithRouter(
    <Routes>
      <Route path={paths.workspaces.lessons.path} element={<LessonList />} />
      <Route path={paths.workspaces.lessonDetail.path} element={<LessonReader />} />
    </Routes>,
    [paths.workspaces.lessons.getHref(WORKSPACE_ID)],
  )
}

describe('LessonList', () => {
  beforeEach(() => {
    vi.mocked(listLessons).mockReset()
    vi.mocked(getLesson).mockReset()
    vi.mocked(requestNextLesson).mockReset()
    vi.mocked(getMission).mockReset()
    // The pending flag lives above the page on purpose, so it survives a test's
    // unmount too. Reset it explicitly or one test's waiting state leaks into the
    // next one's screen.
    usePendingGenerationStore.setState({ pending: {} })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('opens a lesson from the list', async () => {
    const learner = userEvent.setup()
    vi.mocked(listLessons).mockResolvedValue(lessons)
    vi.mocked(getLesson).mockResolvedValue(conceptFixture)
    vi.mocked(getMission).mockResolvedValue(mission)

    renderJourney()

    await learner.click(await screen.findByRole('link', { name: /Solving two-step equations/ }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Solving two-step equations' }),
    ).toBeInTheDocument()
  })

  it('lists each lesson with its number, kind, and length', async () => {
    vi.mocked(listLessons).mockResolvedValue(lessons)
    vi.mocked(getMission).mockResolvedValue(mission)

    renderJourney()

    expect(await screen.findByText('Lesson 3 · Concept')).toBeInTheDocument()
    expect(screen.getByText('8 min')).toBeInTheDocument()
    expect(screen.getByText('Lesson 4 · Hands-on')).toBeInTheDocument()
  })

  it('explains an empty list and still offers the next lesson', async () => {
    vi.mocked(listLessons).mockResolvedValue(noLessons)
    vi.mocked(getMission).mockResolvedValue(mission)

    renderJourney()

    expect(await screen.findByText('No lessons yet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ask for the next lesson/i })).toBeEnabled()
  })

  it('offers a retry when the list does not load', async () => {
    const learner = userEvent.setup()
    vi.mocked(listLessons).mockRejectedValueOnce(new Error('network down'))
    vi.mocked(getMission).mockResolvedValue(mission)

    renderJourney()

    await learner.click(await screen.findByRole('button', { name: 'Try again' }))

    expect(vi.mocked(listLessons).mock.calls.length).toBeGreaterThan(1)
  })

  it('says the next lesson is unavailable, and why, without a mission', async () => {
    vi.mocked(listLessons).mockResolvedValue(lessons)
    vi.mocked(getMission).mockResolvedValue(noMission)

    renderJourney()

    const nextLesson = await screen.findByRole('button', { name: /ask for the next lesson/i })

    expect(nextLesson).toBeDisabled()
    expect(nextLesson).toHaveAccessibleDescription(/until this workspace has a mission/i)
  })

  it('does not claim a workspace has no mission when the check itself failed', async () => {
    const learner = userEvent.setup()
    vi.mocked(listLessons).mockResolvedValue(lessons)
    vi.mocked(getMission)
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValue(mission)

    renderJourney()

    expect(await screen.findByText('The next lesson is unavailable for now')).toBeInTheDocument()
    expect(screen.queryByText('No active mission')).not.toBeInTheDocument()

    await learner.click(screen.getByRole('button', { name: 'Check again' }))

    expect(await screen.findByRole('button', { name: /ask for the next lesson/i })).toBeEnabled()
  })

  it('shows a waiting state once the next lesson has been asked for', async () => {
    const learner = userEvent.setup()
    vi.mocked(listLessons).mockResolvedValue(lessons)
    vi.mocked(getMission).mockResolvedValue(mission)
    vi.mocked(requestNextLesson).mockResolvedValue(undefined)

    renderJourney()

    await learner.click(await screen.findByRole('button', { name: /ask for the next lesson/i }))

    expect(await screen.findByText('Writing your next lesson')).toBeInTheDocument()
  })

  it('keeps the waiting state when the learner leaves the list and comes back', async () => {
    const learner = userEvent.setup()
    vi.mocked(listLessons).mockResolvedValue(lessons)
    vi.mocked(getMission).mockResolvedValue(mission)
    vi.mocked(getLesson).mockResolvedValue(conceptFixture)
    vi.mocked(requestNextLesson).mockResolvedValue(undefined)

    renderJourney()

    await learner.click(await screen.findByRole('button', { name: /ask for the next lesson/i }))
    expect(await screen.findByText('Writing your next lesson')).toBeInTheDocument()

    await learner.click(screen.getByRole('link', { name: /Solving two-step equations/ }))
    await screen.findByRole('heading', { level: 1, name: 'Solving two-step equations' })

    await learner.click(screen.getByRole('link', { name: 'All lessons' }))

    expect(await screen.findByText('Writing your next lesson')).toBeInTheDocument()
  })

  it('keeps waiting until a lesson newer than the last one appears, then stops waiting', async () => {
    vi.mocked(listLessons)
      .mockResolvedValueOnce(lessons)
      .mockResolvedValueOnce(lessons)
      .mockResolvedValue(lessonsWithNewLesson)
    vi.mocked(getMission).mockResolvedValue(mission)
    vi.mocked(requestNextLesson).mockResolvedValue(undefined)

    renderJourney()

    await screen.findByRole('button', { name: /ask for the next lesson/i })

    /*
     * The clock is faked from the click on, which is when the app starts
     * re-reading the list. Waiting out a shipped five-second interval in real
     * time is a slow test that fails on a busy machine, and faking the clock
     * any earlier strands the queries coming in, because Testing Library's
     * waiting needs a real clock to poll with. A raw click rather than
     * userEvent follows from that: userEvent's own delays wait on the clock the
     * fake just replaced.
     */
    vi.useFakeTimers()
    fireEvent.click(screen.getByRole('button', { name: /ask for the next lesson/i }))
    expect(screen.getByText('Writing your next lesson')).toBeInTheDocument()

    const pollOnce = () =>
      act(async () => {
        await vi.advanceTimersByTimeAsync(LESSON_LIST_POLL_INTERVAL_MS)
      })

    // The first poll finds nothing new, so the wait continues. Nothing but a
    // refetch can tell the app the list changed at all.
    await pollOnce()
    expect(screen.getByText('Writing your next lesson')).toBeInTheDocument()

    // A later poll finds lesson 5, and the wait ends. The interval re-arms when
    // each refetch settles rather than on a fixed schedule, so the second tick
    // can land past the clock's first move.
    await pollOnce()
    await pollOnce()

    expect(screen.getByText('Lesson 5 · Review')).toBeInTheDocument()
    expect(screen.queryByText('Writing your next lesson')).not.toBeInTheDocument()
  })

  it('reports a failed request with a retry, and stops waiting so it cannot hang', async () => {
    const learner = userEvent.setup()
    vi.mocked(listLessons).mockResolvedValue(lessons)
    vi.mocked(getMission).mockResolvedValue(mission)
    vi.mocked(requestNextLesson).mockRejectedValueOnce(new Error('network down'))

    renderJourney()

    await learner.click(await screen.findByRole('button', { name: /ask for the next lesson/i }))

    expect(await screen.findByText('Your next lesson could not be requested')).toBeInTheDocument()
    expect(screen.queryByText('Writing your next lesson')).not.toBeInTheDocument()

    vi.mocked(requestNextLesson).mockResolvedValue(undefined)
    await learner.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Writing your next lesson')).toBeInTheDocument()
  })
  it('says a workspace has no active mission when asking is refused for it, and re-reads the mission', async () => {
    const learner = userEvent.setup()
    vi.mocked(listLessons).mockResolvedValue(lessons)
    vi.mocked(getMission).mockResolvedValue(mission)
    vi.mocked(requestNextLesson).mockRejectedValueOnce(noActiveMissionError())

    renderJourney()

    await learner.click(await screen.findByRole('button', { name: /ask for the next lesson/i }))

    expect(await screen.findByText('This workspace has no active mission')).toBeInTheDocument()

    // Not a wait that never ends, and not an offer to send the same refused request.
    expect(screen.queryByText('Writing your next lesson')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
    expect(usePendingGenerationStore.getState().isGenerating(WORKSPACE_ID)).toBe(false)

    // The mission the button was offered on is out of date, so it is read again.
    await waitFor(() => expect(vi.mocked(getMission)).toHaveBeenCalledTimes(2))
  })

  it('stops waiting once the cap has passed, says the lesson did not arrive, and offers to ask again', async () => {
    const learner = userEvent.setup()
    vi.mocked(listLessons).mockResolvedValue(lessons)
    vi.mocked(getMission).mockResolvedValue(mission)
    vi.mocked(requestNextLesson).mockResolvedValue(undefined)

    // A wait that started just under the cap ago, so the screen opens waiting and the
    // cap passes while it is open. Nothing settles and no store value moves when it
    // does: the screen has to notice the clock on its own.
    usePendingGenerationStore.setState({
      pending: {
        [WORKSPACE_ID]: {
          afterNumber: 4,
          startedAt: Date.now() - LESSON_GENERATION_TIMEOUT_MS + 300,
        },
      },
    })

    renderJourney()

    expect(await screen.findByText('Writing your next lesson')).toBeInTheDocument()
    expect(await screen.findByText('Your next lesson did not arrive')).toBeInTheDocument()
    expect(screen.queryByText('Writing your next lesson')).not.toBeInTheDocument()

    // Polling stops with the wait: a timed-out generation asks the list nothing more.
    expect(usePendingGenerationStore.getState().isGenerating(WORKSPACE_ID)).toBe(false)

    await learner.click(screen.getByRole('button', { name: 'Ask again' }))

    expect(vi.mocked(requestNextLesson)).toHaveBeenCalledWith(WORKSPACE_ID)
    expect(await screen.findByText('Writing your next lesson')).toBeInTheDocument()
  })
})
