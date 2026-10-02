import userEvent from '@testing-library/user-event'
import type { UserEvent } from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Route, Routes } from 'react-router'

import { paths } from '@/config/paths'
import { renderWithRouter, screen, waitFor } from '@/test/test-utils'

import { getLesson, submitAttempt } from '../api/lesson-api'
import {
  handsOnFixture,
  segmentsFixture,
  tableComparisonFixture,
} from '../fixtures/lesson-fixtures'
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

  it('marks every link with an underline and every term with a dotted one, so neither is told from prose by colour alone', async () => {
    vi.mocked(getLesson).mockResolvedValue(segmentsFixture)

    renderReader()

    await screen.findByRole('heading', { level: 1, name: 'Terms and citations' })

    // A citation, two cross-references, and the source list's own link: every
    // place a learner can be sent somewhere. Colour alone would leave a learner
    // who cannot see it reading a link as an ordinary word.
    for (const name of [
      'the terms in order',
      'the practice set',
      'the notation cheat sheet',
      'Terms in the order you meet them',
    ]) {
      const link = screen.getByRole('link', { name })
      expect(link, name).toHaveStyle({ textDecorationLine: 'underline' })
      expect(link, name).not.toHaveStyle({ textDecorationStyle: 'dotted' })
    }

    // A term opens a definition rather than going anywhere, and it is marked
    // differently from a link so the learner can tell which is which before
    // pressing either.
    expect(screen.getByRole('button', { name: 'coefficient' })).toHaveStyle({
      textDecorationLine: 'underline',
      textDecorationStyle: 'dotted',
    })
  })

  it.each([
    ['a long code sample', handsOnFixture, 'Setting up the practice set', 'Code sample, python'],
    [
      'a figure wider than the column',
      handsOnFixture,
      'Setting up the practice set',
      'Figure: Four problem cards laid out side by side, one card per problem on the sheet.',
    ],
    [
      'a table wider than the column',
      tableComparisonFixture,
      'Four ways to undo a step',
      'Table: Method, What it does, When it stops working, How you notice',
    ],
  ])(
    'lets a keyboard learner reach %s that scrolls sideways, and says what it is',
    async (_name, fixture, heading, region) => {
      const learner = userEvent.setup()
      vi.mocked(getLesson).mockResolvedValue(fixture)

      renderReader()

      await screen.findByRole('heading', { level: 1, name: heading })

      // A box that scrolls sideways and cannot take focus is a box whose far edge
      // a keyboard learner never sees: the arrow keys scroll whatever has focus,
      // and nothing in a code sample or a figure takes it. So the scrolling box is
      // itself a tab stop, named for what it holds.
      await tabTo(learner, screen.getByRole('group', { name: region }))
    },
  )
})
