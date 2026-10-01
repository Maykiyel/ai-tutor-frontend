import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Route, Routes } from 'react-router'

import { paths } from '@/config/paths'
import { renderWithRouter, screen, waitFor, within } from '@/test/test-utils'

import { getLesson } from '../api/lesson-api'
import {
  conceptFixture,
  figureImageFixture,
  figureMermaidFixture,
  figureSvgFixture,
  hostileSvgFixture,
  lessonFixtures,
  malformedBlockFixture,
  newerVersionFixture,
  reviewFixture,
  raggedTableFixture,
  segmentsFixture,
  tableComparisonFixture,
  unknownBlockFixture,
  wideFigureFixture,
} from '../fixtures/lesson-fixtures'
import { LessonReader } from './lesson-reader'

// The seam: the feature's own API module, stubbed with a fixture response.
// Everything above it — router, params, query layer, screen — is the real thing.
vi.mock('../api/lesson-api')

const WORKSPACE_ID = '7'
const LESSON_ID = '12'

/**
 * Drawing a diagram is genuinely slow. Mermaid is loaded on first use and each
 * diagram is laid out from scratch, which takes seconds under jsdom. The three
 * diagram tests wait for real mermaid output rather than a stub, so they carry
 * their own budget instead of the suite default — and a diagram that does not
 * arrive still fails, loudly, in a test of its own.
 */
const DIAGRAM_TIMEOUT = 60_000

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
    // No highlighter touched it either. A highlighter that evaluates its input is
    // an execution surface, so the code arrives as one flat run of text with no
    // markup wrapped around the words — which is also what makes it copyable
    // without carrying a class name along. See ADR-0001.
    expect(code.children).toHaveLength(0)

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
    // `recall` is one of the contract's nine types and has no component yet. It
    // must behave exactly like a genuinely unknown type rather than breaking the
    // lesson, so that a block arriving before its ticket is not a special case.
    vi.mocked(getLesson).mockResolvedValue({
      ...conceptFixture,
      lesson: {
        ...conceptFixture.lesson,
        blocks: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'The paragraph before the recall block.' }],
          },
          { type: 'recall', id: 'rc1', prompt: 'What undoes adding 4 to both sides?' },
        ],
      },
    })

    renderReader()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Solving two-step equations' }),
    ).toBeInTheDocument()
    expect(screen.getByText('The paragraph before the recall block.')).toBeInTheDocument()
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

  it.each([
    ['prose', conceptFixture, 'Solving two-step equations'],
    ['a figure drawn as inline svg', figureSvgFixture, 'What one step looks like'],
    ['a figure that tried to run code', hostileSvgFixture, 'A figure the model was talked into'],
    ['a figure wider than the column', wideFigureFixture, 'A figure wider than the column'],
    ['a comparison table', tableComparisonFixture, 'Four ways to undo a step'],
    ['a table the model got wrong', raggedTableFixture, 'A table the model got slightly wrong'],
  ])(
    'takes every colour from a theme token in %s, so the lesson reads in either scheme',
    async (_name, fixture, heading) => {
      vi.mocked(getLesson).mockResolvedValue(fixture)

      const { container } = renderReader()

      await screen.findByRole('heading', { level: 1, name: heading })

      // Lesson JSON carries meaning only, so nothing in the payload can name a
      // colour, a size, or a spacing. Every visual value the reader paints must be
      // a theme token, which is what lets a redesign restyle every stored lesson
      // and what lets one set of components serve both colour schemes.
      //
      // This runs over the blocks that carry markup as well as over prose,
      // because a figure is the one block where a payload could smuggle a colour
      // in: the sanitiser is what keeps this true, and this is what proves it.
      const declarations = Array.from(container.querySelectorAll('*')).flatMap((element) =>
        (element.getAttribute('style') ?? '')
          .split(';')
          .map((declaration) => declaration.trim())
          .filter(Boolean),
      )
      const visualProperties =
        /^(color|background|background-color|font-size|margin|padding)(-\w+)?$/

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
    },
  )

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

  it('shows a picture with alt text a screen reader can hear, and the caption that explains it', async () => {
    vi.mocked(getLesson).mockResolvedValue(figureImageFixture)

    renderReader()

    await screen.findByRole('heading', { level: 1, name: 'Two ways to see the same step' })

    // The alt text is the picture's accessible name, so a learner who cannot see
    // it is told what it shows rather than being told it is an image.
    const picture = screen.getByRole('img', {
      name: 'A number line with 2, 4, and 6 marked, and an arrow from 2 to 4.',
    })
    expect(picture).toHaveAttribute('src', 'https://example.org/two-step-number-line.png')

    // The caption travels with it, because a caption the learner has to guess the
    // owner of belongs to nothing.
    expect(screen.getByText('Every step moves by the same amount.')).toBeInTheDocument()
  })

  it('refuses to show a picture whose url is not http or https, and describes it instead', async () => {
    vi.mocked(getLesson).mockResolvedValue(figureImageFixture)

    const { container } = renderReader()

    await screen.findByRole('heading', { level: 1, name: 'Two ways to see the same step' })

    // The payload asked for a javascript: url. There is nowhere safe to send a
    // learner who clicks it, so no image is rendered and the words the lesson
    // wrote about the picture are shown in its place. See ADR-0001.
    expect(
      screen.queryByRole('img', { name: 'A screenshot the payload tried to make a link' }),
    ).not.toBeInTheDocument()
    expect(container.querySelector('img[src^="javascript:"]')).toBeNull()
    expect(screen.getByText('This picture could not be shown.')).toBeInTheDocument()
    expect(screen.getByText('A screenshot the payload tried to make a link')).toBeInTheDocument()
  })

  it('draws an inline svg figure and names it with the alt text the lesson wrote', async () => {
    vi.mocked(getLesson).mockResolvedValue(figureSvgFixture)

    renderReader()

    await screen.findByRole('heading', { level: 1, name: 'What one step looks like' })

    // Inline svg carries no alt attribute of its own, so the figure is named by
    // the wrapper: one accessible name for all three kinds of figure, whatever
    // the payload managed to write.
    const figure = screen.getByRole('img', { name: 'A balance with 2 unknown weights on one side' })

    // The drawing itself is there, and the words inside it are the lesson's own.
    expect(within(figure).getByText('2x + 3')).toBeInTheDocument()
    expect(
      screen.getByText('Whatever you add to one side, you add to the other.'),
    ).toBeInTheDocument()
  })

  it('renders a figure carrying a script and an event handler with neither of them in the page', async () => {
    vi.mocked(getLesson).mockResolvedValue(hostileSvgFixture)

    const { container } = renderReader()

    await screen.findByRole('heading', { level: 1, name: 'A figure the model was talked into' })

    // The lesson still reads. A figure the model was talked into is still a
    // figure, and one that fails to render must not cost the learner the lesson.
    expect(screen.getByText('The paragraph after the figure renders.')).toBeInTheDocument()
    const figure = screen.getByRole('img', {
      name: 'A bar chart the payload tried to make run code',
    })

    // Nothing the payload sent became markup. The stored copy was already
    // sanitised by the backend; this is the second layer, and it is the layer
    // that has to hold. See ADR-0001.
    expect(container.querySelector('script')).toBeNull()
    expect(document.querySelector('script')).toBeNull()
    expect(container.querySelector('[onload], [onclick], [onerror], [onmouseover]')).toBeNull()
    // The svg profile rather than the html one: the payload's html element went
    // with its `foreignObject`, so there is no route from a lesson into a div.
    expect(figure.querySelector('foreignObject')).toBeNull()
    expect(figure.querySelector('svg div')).toBeNull()
    // Nor can a lesson name a colour, a size, or a spacing of its own: the
    // payload's inline css and its stylesheet went with the rest of it.
    expect(figure.querySelector('style')).toBeNull()
    expect(figure.querySelector('[style]')).toBeNull()
    // Only http and https urls are followed, in a figure as anywhere else.
    expect(container.querySelector('a[href^="javascript:"]')).toBeNull()
    expect(container.querySelector('image[href^="data:"]')).toBeNull()
    expect(container.innerHTML).not.toContain('__lessonPwned')

    // And nothing ran: the payload sets this from its script, its onload, and
    // its onclick, so an undefined value is the proof that none of the three
    // reached a browser that executes them.
    expect((window as { __lessonPwned?: boolean }).__lessonPwned).toBeUndefined()
  })

  it('keeps a wide figure inside its own scroll area instead of widening the lesson', async () => {
    vi.mocked(getLesson).mockResolvedValue(wideFigureFixture)

    const { container } = renderReader()

    await screen.findByRole('heading', { level: 1, name: 'A figure wider than the column' })

    const figure = screen.getByRole('img', { name: 'A wide table drawn as a diagram' })

    // The same treatment a long code line gets: a scroll viewport of the
    // figure's own, so a wide drawing scrolls and the prose keeps its width.
    expect(figure.closest('[data-scrollbars="x"]')).toBeInTheDocument()
    expect(container.querySelectorAll('[data-scrollbars="x"]').length).toBeGreaterThan(0)
  })

  it(
    'draws a mermaid diagram and names it with the alt text the lesson wrote',
    async () => {
      vi.mocked(getLesson).mockResolvedValue(figureMermaidFixture)

      renderReader()

      await screen.findByRole('heading', { level: 1, name: 'The move, as a diagram' })

      const diagram = await screen.findByRole(
        'img',
        { name: 'Two boxes and an arrow, from 2x + 3 = 11 to x = 2' },
        { timeout: 30_000 },
      )

      // The words of the diagram are the learner's to read, and the caption that
      // came with the block sits under it.
      expect(diagram).toHaveTextContent('Add 4 to both sides')
      expect(diagram).toHaveTextContent('x = 2')
      expect(
        screen.getByText('One move at a time, and never on one side only.'),
      ).toBeInTheDocument()
    },
    DIAGRAM_TIMEOUT,
  )

  it(
    'draws a diagram as inert text: no html label and nothing to click',
    async () => {
      vi.mocked(getLesson).mockResolvedValue(figureMermaidFixture)

      const { container } = renderReader()

      await screen.findByRole('heading', { level: 1, name: 'The move, as a diagram' })

      // Mermaid runs in strict mode with html labels off, so a label is words. The
      // payload's `<b>` stayed in the label as the four characters the learner sees,
      // and never became an element. See ADR-0001.
      const labelled = await screen.findByRole(
        'img',
        { name: 'A diagram whose label carries markup and whose box carries a click' },
        { timeout: 30_000 },
      )
      // Mermaid lays a label out word by word, so the four characters the learner
      // reads are the ones that matter, not the spacing between them.
      expect(labelled.textContent).toMatch(/<b>\s*Undo\s*<\/b>\s*addition/)
      expect(container.querySelector('foreignObject')).toBeNull()
      expect(container.querySelector('b')).toBeNull()

      // The click callback is gone too: a box in a diagram is not a link, and the
      // one the payload asked for ran script.
      expect(labelled.querySelector('a[href]')).toBeNull()
      expect(container.querySelector('svg a[href^="javascript:"]')).toBeNull()
      expect((window as { __lessonPwned?: boolean }).__lessonPwned).toBeUndefined()
    },
    DIAGRAM_TIMEOUT,
  )

  it(
    'falls back to the caption and alt text when a diagram cannot be drawn',
    async () => {
      vi.mocked(getLesson).mockResolvedValue(figureMermaidFixture)

      renderReader()

      await screen.findByRole('heading', { level: 1, name: 'The move, as a diagram' })

      // A diagram the model wrote wrong must not take the lesson with it: the
      // lesson reads, the diagrams that do work are drawn, and the one that does
      // not says so in words.
      const fallback = await screen.findByRole('status', {}, { timeout: 30_000 })
      expect(fallback).toHaveTextContent('This diagram could not be drawn')
      expect(fallback).toHaveTextContent('A diagram the model wrote wrong')
      expect(
        screen.getByText('It never arrived, so its caption is all there is.'),
      ).toBeInTheDocument()

      expect(
        await screen.findByRole(
          'img',
          { name: 'Two boxes and an arrow, from 2x + 3 = 11 to x = 2' },
          { timeout: 30_000 },
        ),
      ).toBeInTheDocument()
    },
    DIAGRAM_TIMEOUT,
  )

  it('reads a table as headers and rows the learner can navigate cell by cell', async () => {
    vi.mocked(getLesson).mockResolvedValue(tableComparisonFixture)

    renderReader()

    await screen.findByRole('heading', { level: 1, name: 'Four ways to undo a step' })

    const table = screen.getByRole('table')

    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
    ).toEqual(['Method', 'What it does', 'When it stops working', 'How you notice'])

    expect(within(table).getByRole('cell', { name: 'Work backwards' })).toBeInTheDocument()
    // Every cell is a cell rather than a paragraph of run-together words, so a
    // screen reader can read the comparison across rather than down.
    expect(within(table).getAllByRole('row').length).toBeGreaterThan(4)
  })

  it('keeps a long table scrolling inside its own box instead of widening the page', async () => {
    vi.mocked(getLesson).mockResolvedValue(tableComparisonFixture)

    renderReader()

    await screen.findByRole('heading', { level: 1, name: 'Four ways to undo a step' })

    const table = screen.getByRole('table')

    // The same treatment a long code line gets: the table owns its horizontal
    // scroll, so four columns of comparison can be wider than the column of
    // prose without the prose moving.
    expect(table.closest('[data-scrollbars="x"]')).toBeInTheDocument()
  })

  it('shows a row that does not line up with its headers rather than dropping it', async () => {
    vi.mocked(getLesson).mockResolvedValue(raggedTableFixture)

    renderReader()

    await screen.findByRole('heading', { level: 1, name: 'A table the model got slightly wrong' })

    const table = screen.getByRole('table')
    const rows = within(table).getAllByRole('row')
    const header = rows[0]
    const body = rows.slice(1)

    // Three headers, three rows: a comparison the learner came for is not worth
    // dropping over a cell count. The backend is the layer that rejects one at
    // write time; the reader shows what arrived.
    expect(within(header).getAllByRole('columnheader')).toHaveLength(4)
    expect(body).toHaveLength(3)

    // A short row is padded out to the same columns, so every cell still sits
    // under a header and the columns stay where the reader's eye expects them.
    expect(within(body[1]).getAllByRole('cell')).toHaveLength(4)
    expect(within(body[1]).getByRole('cell', { name: 'Divide by 2' })).toBeInTheDocument()
    expect(within(body[1]).getAllByRole('cell')[2]).toBeEmptyDOMElement()
    expect(within(body[1]).getAllByRole('cell')[3]).toBeEmptyDOMElement()

    // A long row keeps the words it was given rather than silently losing them,
    // under a blank header rather than a header nobody wrote.
    expect(within(header).getAllByRole('columnheader')[3]).toBeEmptyDOMElement()
    expect(within(body[2]).getAllByRole('cell')).toHaveLength(4)
    expect(within(body[2]).getByRole('cell', { name: 'and both sides read 7' })).toBeInTheDocument()
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
