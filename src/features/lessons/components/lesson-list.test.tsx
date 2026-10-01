import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Route, Routes } from 'react-router'

import { paths } from '@/config/paths'
import { renderWithRouter, screen } from '@/test/test-utils'

import { getLesson, listLessons } from '../api/lesson-api'
import { conceptFixture } from '../fixtures/lesson-fixtures'
import { emptyLessonListResponse, lessonListResponse } from '../fixtures/lesson-list-fixtures'
import { lessonListResponseSchema } from '../schemas/lesson-list-schema'
import { LessonList } from './lesson-list'
import { LessonReader } from './lesson-reader'

vi.mock('../api/lesson-api')

const WORKSPACE_ID = '7'

const lessons = lessonListResponseSchema.parse(lessonListResponse)

/**
 * The list and the reader as one journey, because "the learner can reach a lesson"
 * is a claim about the two screens together rather than about either alone.
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
  })

  it('opens a lesson from the list', async () => {
    const learner = userEvent.setup()
    vi.mocked(listLessons).mockResolvedValue(lessons)
    vi.mocked(getLesson).mockResolvedValue(conceptFixture)

    renderJourney()

    await learner.click(await screen.findByRole('link', { name: /Solving two-step equations/ }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Solving two-step equations' }),
    ).toBeInTheDocument()
  })

  it('lists each lesson with its number, kind, and length', async () => {
    vi.mocked(listLessons).mockResolvedValue(lessons)

    renderJourney()

    expect(await screen.findByText('Lesson 3 · Concept')).toBeInTheDocument()
    expect(screen.getByText('8 min')).toBeInTheDocument()
    expect(screen.getByText('Lesson 4 · Hands-on')).toBeInTheDocument()
  })

  it('explains an empty list rather than showing a blank page', async () => {
    vi.mocked(listLessons).mockResolvedValue(
      lessonListResponseSchema.parse(emptyLessonListResponse),
    )

    renderJourney()

    expect(await screen.findByText('No lessons yet')).toBeInTheDocument()
  })

  it('offers a retry when the list does not load', async () => {
    const learner = userEvent.setup()
    vi.mocked(listLessons).mockRejectedValueOnce(new Error('network down'))

    renderJourney()

    await learner.click(await screen.findByRole('button', { name: 'Try again' }))

    expect(vi.mocked(listLessons).mock.calls.length).toBeGreaterThan(1)
  })
})
