import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Route, Routes } from 'react-router'

import { paths } from '@/config/paths'
import { renderWithRouter, screen, within } from '@/test/test-utils'

import { getLesson } from '../api/lesson-api'
import {
  conceptFixture,
  lessonFixtures,
  malformedBlockFixture,
  newerVersionFixture,
  reviewFixture,
  unknownBlockFixture,
} from '../fixtures/lesson-fixtures'
import { LessonReader } from './lesson-reader'

// The seam: the feature's own API module, stubbed with a fixture response.
// Everything above it — router, params, query layer, screen — is the real thing.
vi.mock('../api/lesson-api')

const WORKSPACE_ID = '7'
const LESSON_ID = '12'

function renderReader(lessonId = LESSON_ID) {
  return renderWithRouter(
    <Routes>
      <Route path={paths.workspaces.lessonDetail.path} element={<LessonReader />} />
    </Routes>,
    [paths.workspaces.lessonDetail.getHref(WORKSPACE_ID, lessonId)],
  )
}

describe('LessonReader', () => {
  beforeEach(() => {
    vi.mocked(getLesson).mockReset()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('opens by deep link and shows what the learner is about to read', async () => {
    vi.mocked(getLesson).mockResolvedValue(conceptFixture)

    renderReader()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Solving two-step equations' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Lesson 3 · Concept')).toBeInTheDocument()
    expect(screen.getByText('8 min')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Solve an equation that needs two operations, and say why the order does not change the answer.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Your mission is to get through the practice set before Friday. Almost every problem in it needs this one move.',
      ),
    ).toBeInTheDocument()
  })

  it('reads the lesson as paragraphs, headings, callouts, and code', async () => {
    vi.mocked(getLesson).mockResolvedValue(conceptFixture)

    renderReader()

    await screen.findByRole('heading', { level: 1, name: 'Solving two-step equations' })

    // Headings are real headings, so the lesson has a structure to follow.
    expect(
      screen.getByRole('heading', { level: 2, name: 'One operation, both sides' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 3, name: 'Work backwards from the answer' }),
    ).toBeInTheDocument()

    expect(
      screen.getByText(/An equation is a claim that two things are equal/).closest('p'),
    ).toBeInTheDocument()

    // A glossary term the app cannot resolve yet still leaves its own words in
    // the sentence, so the paragraph reads as one piece of prose.
    expect(screen.getByText(/If you know the answer, start from it\./)).toHaveTextContent(
      'inverse operation',
    )

    expect(screen.getByRole('note', { name: 'Note' })).toHaveTextContent(
      'Undo addition before multiplication',
    )
  })

  it('distinguishes callout tones by words and by shape, not only by colour', async () => {
    vi.mocked(getLesson).mockResolvedValue(conceptFixture)

    renderReader()

    const win = await screen.findByRole('note', { name: 'Win' })
    const watchOut = screen.getByRole('note', { name: 'Watch out' })
    const note = screen.getByRole('note', { name: 'Note' })

    // Three distinct tone names, each reachable without perceiving colour.
    expect(new Set([win, watchOut, note]).size).toBe(3)
    expect(win).toHaveTextContent('You can check any answer')
    expect(watchOut).toHaveTextContent('breaks the equation')
    expect(note).toHaveTextContent('Undo addition before multiplication')
  })

  it('shows code as inert, selectable text that scrolls instead of stretching the page', async () => {
    vi.mocked(getLesson).mockResolvedValue(conceptFixture)

    const { container } = renderReader()

    await screen.findByRole('heading', { level: 1, name: 'Solving two-step equations' })

    const code = screen.getByText(/def solve\(two_step: str\)/)

    // A real <pre> text node: selectable and copyable, never markup.
    expect(code.tagName).toBe('PRE')
    // The payload's angle brackets are text, so nothing in them became an element.
    expect(code).toHaveTextContent("<script>alert('never markup')</script>")
    expect(container.querySelector('script')).toBeNull()

    // Long lines scroll inside the block rather than widening the page.
    const scrollArea = container.querySelector('[data-scrollbars="x"]')
    expect(scrollArea).toBeInTheDocument()
  })

  it('renders a lesson of each kind', async () => {
    vi.mocked(getLesson).mockImplementation(async (lessonId: string) => {
      const fixture = lessonFixtures[lessonId as keyof typeof lessonFixtures]

      if (!fixture) {
        throw new Error('no such fixture')
      }

      return fixture
    })

    const { unmount } = renderReader('solving-two-step-equations')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Solving two-step equations' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Lesson 3 · Concept')).toBeInTheDocument()
    unmount()

    const handsOn = renderReader('setting-up-the-practice-set')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Setting up the practice set' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Lesson 4 · Hands-on')).toBeInTheDocument()
    handsOn.unmount()

    renderReader('reviewing-two-step-equations')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Reviewing two-step equations' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Lesson 5 · Review')).toBeInTheDocument()
    // A review lesson has no paragraphs and no code, and reading it must not
    // depend on them.
    expect(screen.getByRole('note', { name: 'Note' })).toHaveTextContent(
      'Answer from memory first.',
    )
  })

  it('renders everything else when a block type is unrecognised, and says something was skipped', async () => {
    vi.mocked(getLesson).mockResolvedValue(unknownBlockFixture)

    renderReader()

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'A lesson the app does not fully understand',
      }),
    ).toBeInTheDocument()

    // The paragraphs either side of the unknown block both render.
    expect(screen.getByText('This paragraph is ordinary, so it renders.')).toBeInTheDocument()
    expect(
      screen.getByText(/This paragraph renders too\. The gap between them/),
    ).toBeInTheDocument()

    // A gap must not read as a short lesson.
    // Both unrecognised blocks are counted, so the learner is told the gap is real.
    expect(
      screen.getByRole('status', { name: 'Part of this lesson is missing' }),
    ).toHaveTextContent('2 parts of this lesson could not be shown')

    // The type is logged once, not once per block: two blocks of the same unknown
    // type are one backend bug, and two identical lines would suggest two.
    const warnings = vi
      .mocked(console.warn)
      .mock.calls.map((call) => String(call[0]))
      .filter((message) => message.includes('unknown lesson block type'))
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('sandbox')
  })

  it('reads a block type the contract defines but this build does not render yet', async () => {
    // `figure` is one of the contract's nine types and has no component yet. It
    // must behave exactly like a genuinely unknown type rather than breaking the
    // lesson, so that a block arriving before its ticket is not a special case.
    vi.mocked(getLesson).mockResolvedValue({
      ...conceptFixture,
      lesson: {
        ...conceptFixture.lesson,
        blocks: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'The paragraph before the figure.' }],
          },
          { type: 'figure', kind: 'image', source: 'https://example.org/x.png', alt: 'A graph' },
        ],
      },
    })

    renderReader()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Solving two-step equations' }),
    ).toBeInTheDocument()
    expect(screen.getByText('The paragraph before the figure.')).toBeInTheDocument()
    expect(
      screen.getByRole('status', { name: 'Part of this lesson is missing' }),
    ).toHaveTextContent('One part of this lesson could not be shown')
  })

  it('skips a malformed block, keeps the rest, and tells the learner something was skipped', async () => {
    vi.mocked(getLesson).mockResolvedValue(malformedBlockFixture)

    renderReader()

    await screen.findByRole('heading', { level: 1, name: 'A lesson with one broken block' })

    expect(screen.getByText('This paragraph is well formed, so it renders.')).toBeInTheDocument()
    expect(
      screen.getByText('This paragraph is well formed too, and it renders like the first one.'),
    ).toBeInTheDocument()
    // The broken block itself renders nothing at all.
    expect(
      screen.queryByText('This block claims to be a paragraph and carries no content'),
    ).not.toBeInTheDocument()

    expect(
      screen.getByRole('status', { name: 'Part of this lesson is missing' }),
    ).toBeInTheDocument()
  })

  it('renders a newer lesson with a warning, rather than refusing it', async () => {
    vi.mocked(getLesson).mockResolvedValue(newerVersionFixture)

    renderReader()

    const banner = await screen.findByRole('status', {
      name: 'This lesson is newer than the app',
    })
    expect(banner).toHaveTextContent('format version 3')

    // A version gap is a warning, not a wall: the lesson still reads.
    expect(
      screen.getByText(/blocks in this lesson match what the app understands/),
    ).toBeInTheDocument()
  })

  it('takes every colour from a theme token, so the lesson reads in either scheme', async () => {
    vi.mocked(getLesson).mockResolvedValue(conceptFixture)

    const { container } = renderReader()

    await screen.findByRole('heading', { level: 1, name: 'Solving two-step equations' })

    // Lesson JSON carries meaning only, so nothing in the payload can name a
    // colour, a size, or a spacing. Every visual value the reader paints must be
    // a theme token, which is what lets a redesign restyle every stored lesson
    // and what lets one set of components serve both colour schemes.
    const declarations = Array.from(container.querySelectorAll('*')).flatMap((element) =>
      (element.getAttribute('style') ?? '')
        .split(';')
        .map((declaration) => declaration.trim())
        .filter(Boolean),
    )
    const visualProperties = /^(color|background|background-color|font-size|margin|padding)(-\w+)?$/

    const notFromAToken = declarations.filter((declaration) => {
      const [property, ...rest] = declaration.split(':')
      const value = rest.join(':').trim()

      return (
        visualProperties.test(property.trim()) &&
        !value.startsWith('var(') &&
        !value.startsWith('calc(')
      )
    })

    expect(notFromAToken).toEqual([])
  })

  it('offers a retry when the lesson does not load, and the retry loads it', async () => {
    const learner = userEvent.setup()
    vi.mocked(getLesson)
      .mockRejectedValueOnce(new Error('unreadable response'))
      .mockResolvedValue(conceptFixture)

    renderReader()

    expect(await screen.findByText('This lesson could not be loaded')).toBeInTheDocument()

    await learner.click(screen.getByRole('button', { name: 'Try again' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Solving two-step equations' }),
    ).toBeInTheDocument()
  })

  it('degrades a glossary term the response does not carry to plain text', async () => {
    vi.mocked(getLesson).mockResolvedValue({
      ...conceptFixture,
      terms: {},
    })

    renderReader()

    // The lesson still reads. A term the response does not hydrate degrades to
    // plain words rather than failing the block or losing the sentence.
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Solving two-step equations' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/If you know the answer, start from it\./)).toHaveTextContent(
      'inverse operation',
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('lets the learner get back to the lesson list', async () => {
    vi.mocked(getLesson).mockResolvedValue(reviewFixture)

    renderReader()

    expect(await screen.findByRole('link', { name: 'All lessons' })).toHaveAttribute(
      'href',
      paths.workspaces.lessons.getHref(WORKSPACE_ID),
    )
    expect(
      within(screen.getByRole('note', { name: 'Win' })).getByText(/roughly right/),
    ).toBeInTheDocument()
  })
})
