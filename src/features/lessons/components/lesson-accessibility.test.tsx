import userEvent from '@testing-library/user-event'
import type { UserEvent } from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Route, Routes } from 'react-router'

import { paths } from '@/config/paths'
import { renderWithRouter, screen, waitFor } from '@/test/test-utils'

import { getLesson, submitAttempt } from '../api/lesson-api'
import { segmentsFixture } from '../fixtures/lesson-fixtures'
import { LessonReader } from './lesson-reader'

// The seam: the feature's own API module, stubbed with a fixture response.
// Everything above it — router, params, query layer, screen — is the real thing.
vi.mock('../api/lesson-api')

/**
 * The reader as a keyboard-only learner with a screen reader meets it.
 *
 * Every claim here is something that learner can do or hear: what Tab reaches,
 * what a control is called and described as, what a live region says, and what a
 * key press changes. None of it asks which component ran.
 */

const WORKSPACE_ID = '7'
const LESSON_ID = '12'

function renderReader() {
  return renderWithRouter(
    <Routes>
      <Route path={paths.workspaces.lessonDetail.path} element={<LessonReader />} />
    </Routes>,
    [paths.workspaces.lessonDetail.getHref(WORKSPACE_ID, LESSON_ID)],
  )
}

/**
 * Presses Tab until the element has focus, and fails if it never does. Tabbing
 * rather than calling `focus()` is the point: it proves the element is in the tab
 * order at all, which a hand-placed focus never would.
 */
async function tabTo(learner: UserEvent, element: HTMLElement, limit = 40) {
  for (let presses = 0; presses < limit && document.activeElement !== element; presses += 1) {
    await learner.tab()
  }

  expect(element).toHaveFocus()
}

describe('the reader, by keyboard and by ear', () => {
  beforeEach(() => {
    vi.mocked(getLesson).mockReset()
    vi.mocked(submitAttempt).mockReset()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('reads a term its definition when focus lands on it, and Escape closes the card without moving focus', async () => {
    const learner = userEvent.setup()
    vi.mocked(getLesson).mockResolvedValue(segmentsFixture)

    renderReader()

    await screen.findByRole('heading', { level: 1, name: 'Terms and citations' })

    const definition = segmentsFixture.terms['9'].definition
    const term = screen.getByRole('button', { name: 'coefficient' })

    // The card is for the eye. A screen reader stays on the button when focus
    // lands, so the definition has to reach the ear through the button itself.
    expect(term).toHaveAccessibleDescription(definition)

    await tabTo(learner, term)
    expect(await screen.findByRole('dialog')).toHaveTextContent(definition)

    // Content that appears on focus has to be dismissible without moving focus,
    // or a learner who wants the card out of the way has to leave the sentence.
    await learner.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(term).toHaveFocus()

    // And leaving the term closes it the ordinary way.
    await learner.tab()
    expect(term).not.toHaveFocus()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
