import userEvent from '@testing-library/user-event'
import type { UserEvent } from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Route, Routes } from 'react-router'

import { paths } from '@/config/paths'
import { renderWithRouter, screen, waitFor, within } from '@/test/test-utils'

import { getLesson, submitAttempt } from '../api/lesson-api'
import { attemptResultResponse } from '../fixtures/attempt-result-fixtures'
import {
  attemptFixture,
  figureImageFixture,
  figureSvgFixture,
  handsOnFixture,
  hostileSvgFixture,
  segmentsFixture,
  tableComparisonFixture,
  wideFigureFixture,
} from '../fixtures/lesson-fixtures'
import { parseAttemptResult } from '../schemas/attempt-schema'
import type { ParsedLessonResponse } from '../schemas/lesson-schema'
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

type QuizQuestionPayload = {
  id: string
  prompt: string
  options: { id: string; text: string }[]
}

/** The lesson as stored, so the walk below is read off the payload rather than retyped. */
function payloadOf(fixture: ParsedLessonResponse) {
  const blocks = fixture.lesson.blocks as { type?: string }[]
  const quiz = blocks.find((block) => block.type === 'quiz') as {
    questions: QuizQuestionPayload[]
  }
  const steps = blocks.find((block) => block.type === 'steps') as {
    items: { instruction: string }[]
  }
  const recalls = blocks.filter((block) => block.type === 'recall') as { prompt: string }[]

  return { questions: quiz.questions, steps: steps.items, recalls }
}

/** A stop in the tab order, named the way a screen reader names it. */
type Stop = {
  role: 'link' | 'button' | 'group' | 'checkbox' | 'radio' | 'textbox'
  name: string
  /** What the learner does once focus is there, and what they hear back. */
  then?: () => Promise<void>
}

describe('the reader, by keyboard and by ear', () => {
  beforeEach(() => {
    vi.mocked(getLesson).mockReset()
    vi.mocked(submitAttempt).mockReset()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('reads a whole lesson with the keyboard alone: every term, link, scrolling block and practice control, in reading order', async () => {
    const learner = userEvent.setup()
    vi.mocked(getLesson).mockResolvedValue(attemptFixture)
    vi.mocked(submitAttempt).mockResolvedValue(parseAttemptResult(attemptResultResponse))

    renderReader()

    await screen.findByRole('heading', { level: 1, name: 'Answers and the checklist' })

    const { questions, steps, recalls } = payloadOf(attemptFixture)
    const [q1, q2, q3] = questions
    const definition = attemptFixture.terms['4'].definition

    // Every stop Tab makes, in order, from the top of the lesson to the submit
    // action. Exact, not "eventually": a control missing from this list is one a
    // keyboard learner cannot reach, and an extra stop is one they did not ask for.
    const stops: Stop[] = [
      { role: 'link', name: 'All lessons' },
      {
        role: 'button',
        name: 'inverse operation',
        // The definition card opens on focus, and the ear gets it too.
        then: async () => {
          expect(await screen.findByRole('dialog')).toHaveTextContent(definition)
          expect(document.activeElement).toHaveAccessibleDescription(definition)
        },
      },
      {
        role: 'link',
        name: 'the worked examples show',
        // ...and closes on blur.
        then: async () => {
          await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
        },
      },
      { role: 'link', name: 'solving two-step equations' },
      { role: 'link', name: 'one move at a time' },
      { role: 'group', name: 'Code sample, python' },
      { role: 'group', name: 'Table: Move, Undoes' },
      {
        role: 'group',
        name: 'Figure: A balance with 2x + 3 on one side and 11 on the other, and an arrow for each move.',
      },
      {
        role: 'checkbox',
        name: steps[0].instruction,
        then: async () => {
          await learner.keyboard(' ')
          expect(screen.getByRole('checkbox', { name: steps[0].instruction })).toBeChecked()
        },
      },
      { role: 'checkbox', name: steps[1].instruction },
      { role: 'checkbox', name: steps[2].instruction },
      {
        // One stop per question. Space picks the option under focus, and the
        // feedback arrives in the live region named after the question.
        role: 'radio',
        name: q1.options[0].text,
        then: async () => {
          await learner.keyboard(' ')
          expect(screen.getByRole('status', { name: q1.prompt })).toHaveTextContent('Correct')
        },
      },
      {
        role: 'radio',
        name: q2.options[0].text,
        // The arrow keys move within a question and choose as they go.
        then: async () => {
          await learner.keyboard('{ArrowDown}')
          expect(screen.getByRole('radio', { name: q2.options[1].text })).toHaveFocus()
          expect(screen.getByRole('status', { name: q2.prompt })).toHaveTextContent('Not quite')
        },
      },
      // Left unanswered: tabbing past a question is allowed.
      { role: 'radio', name: q3.options[0].text },
      {
        role: 'textbox',
        name: recalls[0].prompt,
        then: async () => {
          await learner.keyboard('Order matters.')
        },
      },
      { role: 'textbox', name: recalls[1].prompt },
      // The sources list, last before the submit action.
      { role: 'link', name: 'Two-step equations, worked slowly' },
      { role: 'link', name: 'Inverse operations, one at a time' },
      {
        role: 'button',
        name: 'Send my answers',
        then: async () => {
          await learner.keyboard('{Enter}')
          expect(
            await screen.findByRole('heading', { level: 2, name: 'How your answers went' }),
          ).toBeInTheDocument()
        },
      },
    ]

    for (const stop of stops) {
      await learner.tab()

      const expected = screen.getByRole(stop.role, { name: stop.name })
      expect(document.activeElement, `Tab should reach the ${stop.role} "${stop.name}" next`).toBe(
        expected,
      )

      await stop.then?.()
    }

    // One attempt went out, carrying what was done by keyboard.
    expect(submitAttempt).toHaveBeenCalledTimes(1)
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

  it.each([
    ['pictures by url', figureImageFixture],
    ['inline svg', figureSvgFixture],
    ['inline svg that tried to run code', hostileSvgFixture],
    ['a figure wider than the column', wideFigureFixture],
    ['a lesson with every block type in it', attemptFixture],
  ])(
    'names every figure in %s with the alt text its payload wrote, and nothing on the page is an unnamed image',
    async (_name, fixture) => {
      vi.mocked(getLesson).mockResolvedValue(fixture)

      const { container } = renderReader()

      await screen.findByRole('heading', { level: 1, name: fixture.lesson.title })

      const figures = (fixture.lesson.blocks as { type?: string; alt?: string }[]).filter(
        (block) => block.type === 'figure' && block.alt?.trim(),
      )
      expect(figures.length).toBeGreaterThan(0)

      for (const { alt } of figures) {
        // Each figure is found by the words its payload wrote: as the image's own
        // name when it can be shown, and as the words in its place when it cannot.
        const figure = screen.getByRole('group', { name: `Figure: ${alt}` })
        const named = within(figure).queryByRole('img', { name: alt })

        expect(named ?? within(figure).getByText(alt!)).toBeInTheDocument()
      }

      // Nothing slipped through unnamed: an `img` with an empty alt is skipped by a
      // screen reader as decoration, and a drawing with no name is announced as
      // "image" and nothing else.
      for (const image of container.querySelectorAll('img')) {
        expect(image.getAttribute('alt')?.trim(), image.outerHTML).toBeTruthy()
      }
      for (const image of screen.queryAllByRole('img')) {
        expect(image).toHaveAccessibleName()
      }
    },
  )

  it('skips a figure that came with no alt text and says so, rather than showing a picture a screen reader cannot describe', async () => {
    vi.mocked(getLesson).mockResolvedValue(figureImageFixture)

    const { container } = renderReader()

    await screen.findByRole('heading', { level: 1, name: 'Two ways to see the same step' })

    // The contract says alt text is never empty. A figure that breaks that rule is
    // a malformed block like any other: skipped, named, and the rest still reads.
    expect(container.querySelector('img[src*="a-picture-nobody-described"]')).toBeNull()
    expect(
      screen.queryByText('The model drew this and forgot to say what it shows.'),
    ).not.toBeInTheDocument()

    const notice = screen.getByRole('status', { name: 'Part of this lesson is missing' })
    expect(within(notice).getByRole('listitem')).toHaveTextContent(
      'A figure, in a shape this app cannot read',
    )
    expect(
      screen.getByRole('img', {
        name: 'A number line with 2, 4, and 6 marked, and an arrow from 2 to 4.',
      }),
    ).toBeInTheDocument()
  })
})
