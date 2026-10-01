import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Route, Routes } from 'react-router'

import { paths } from '@/config/paths'
import { renderWithRouter, screen, waitFor, within } from '@/test/test-utils'

import { getLesson } from '../api/lesson-api'
import {
  conceptFixture,
  lessonFixtures,
  malformedBlockFixture,
  newerVersionFixture,
  reviewFixture,
  segmentsFixture,
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

    // The id is logged, so whoever reads the console can see the response and
    // the lesson disagree about what the workspace glossary holds.
    expect(
      vi
        .mocked(console.warn)
        .mock.calls.map((call) => String(call[0]))
        .filter((message) => message.includes('glossary term 4')),
    ).toHaveLength(1)
  })

  it('shows a term definition on hover and on keyboard focus, and closes it again', async () => {
    const learner = userEvent.setup()
    vi.mocked(getLesson).mockResolvedValue(conceptFixture)

    renderReader()

    await screen.findByRole('heading', { level: 1, name: 'Solving two-step equations' })

    const term = screen.getByRole('button', { name: 'inverse operation' })
    // The card is a dialog, and it is not in the document until the learner asks
    // for it: a definition that covers the lesson before anyone asked is worse
    // than no definition.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await learner.hover(term)

    const hovered = await screen.findByRole('dialog')
    expect(hovered).toHaveTextContent(
      'The operation that undoes another one: subtraction undoes addition, and division undoes multiplication.',
    )
    // The aliases to avoid travel with the definition, so the learner keeps one
    // word per idea without having to remember which word the lessons chose.
    expect(hovered).toHaveTextContent('Avoid')
    expect(hovered).toHaveTextContent('opposite operation')
    expect(hovered).toHaveTextContent('reverse operation')

    await learner.unhover(term)

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('gives a keyboard learner the same definition as a pointing one', async () => {
    const learner = userEvent.setup()
    vi.mocked(getLesson).mockResolvedValue(conceptFixture)

    renderReader()

    await screen.findByRole('heading', { level: 1, name: 'Solving two-step equations' })

    const term = screen.getByRole('button', { name: 'inverse operation' })

    // Tabbed to rather than focused directly, so the test proves the term is
    // reachable by keyboard at all and not merely focusable by hand.
    for (let presses = 0; presses < 20 && document.activeElement !== term; presses += 1) {
      await learner.tab()
    }
    expect(term).toHaveFocus()

    const card = await screen.findByRole('dialog')
    expect(card).toHaveTextContent('The operation that undoes another one')

    await learner.tab()

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('ends the lesson with the sources it cites, and says which one to read first', async () => {
    vi.mocked(getLesson).mockResolvedValue(conceptFixture)

    renderReader()

    await screen.findByRole('heading', { level: 1, name: 'Solving two-step equations' })

    const sources = screen.getByRole('region', { name: 'Sources' })
    const source = within(sources).getByRole('link', { name: 'Two-step equations, worked slowly' })

    // Every entry carries the title, because a citation whose source has no name
    // is a citation the learner cannot choose between.
    expect(source).toHaveAttribute('href', 'https://example.org/two-step-equations')
    // A source is somebody else's page, so it opens away from the app and cannot
    // reach back into it.
    expect(source).toHaveAttribute('target', '_blank')
    expect(source.getAttribute('rel')).toContain('noopener')
    expect(source.getAttribute('rel')).toContain('noreferrer')

    // The recommendation is the lesson's own claim about the source, so it is
    // shown as words rather than as a highlight the learner has to interpret.
    expect(sources).toHaveTextContent('Read this first')
    expect(sources).toHaveTextContent(
      'It works one equation at a time, which is the pace you read at.',
    )
  })

  it('turns a citation into a link to its source', async () => {
    vi.mocked(getLesson).mockResolvedValue(segmentsFixture)

    renderReader()

    await screen.findByRole('heading', { level: 1, name: 'Terms and citations' })

    const citation = screen.getByRole('link', { name: 'the terms in order' })

    expect(citation).toHaveAttribute('href', 'https://example.org/terms-in-order')
    expect(citation).toHaveAttribute('target', '_blank')
    expect(citation.getAttribute('rel')).toContain('noopener')
    expect(citation.getAttribute('rel')).toContain('noreferrer')
  })

  it('never follows a source url that is not http or https', async () => {
    vi.mocked(getLesson).mockResolvedValue(segmentsFixture)

    renderReader()

    await screen.findByRole('heading', { level: 1, name: 'Terms and citations' })

    // The url in that source is a javascript: one. It is not rendered as a link
    // in the prose, and not in the source list either: there is nowhere safe for
    // a learner to click here. See ADR-0001.
    expect(screen.queryByRole('link', { name: 'an unsanitised source' })).not.toBeInTheDocument()
    expect(screen.getByText(/Worked through in/, { exact: false })).toHaveTextContent(
      'an unsanitised source',
    )
    expect(
      within(screen.getByRole('region', { name: 'Sources' })).queryByRole('link', {
        name: 'A source whose url was never checked',
      }),
    ).not.toBeInTheDocument()
  })

  it('sends a cross-reference to the lesson and the reference doc it names', async () => {
    vi.mocked(getLesson).mockResolvedValue(segmentsFixture)

    renderReader()

    await screen.findByRole('heading', { level: 1, name: 'Terms and citations' })

    expect(screen.getByRole('link', { name: 'the practice set' })).toHaveAttribute(
      'href',
      paths.workspaces.lessonDetail.getHref(WORKSPACE_ID, '4'),
    )
    expect(screen.getByRole('link', { name: 'the notation cheat sheet' })).toHaveAttribute(
      'href',
      paths.workspaces.referenceDocDetail.getHref(WORKSPACE_ID, '5'),
    )
  })

  it('reads a cross-reference it cannot resolve as plain words, rather than sending the learner nowhere', async () => {
    vi.mocked(getLesson).mockResolvedValue(segmentsFixture)

    renderReader()

    await screen.findByRole('heading', { level: 1, name: 'Terms and citations' })

    expect(
      screen.queryByRole('link', { name: 'a lesson that no longer exists' }),
    ).not.toBeInTheDocument()
    expect(screen.getByText(/Nothing in this lesson points at/)).toHaveTextContent(
      'a lesson that no longer exists',
    )
  })

  it('reads inline code as an identifier without making it shout', async () => {
    vi.mocked(getLesson).mockResolvedValue(segmentsFixture)

    renderReader()

    await screen.findByRole('heading', { level: 1, name: 'Terms and citations' })

    const identifier = screen.getByText('value')

    // A `code` element: selectable and copyable, and inert — never a control and
    // never markup. See ADR-0001.
    expect(identifier.tagName).toBe('CODE')
    expect(identifier.closest('button, a')).toBeNull()
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
