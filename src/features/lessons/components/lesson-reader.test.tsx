import userEvent from '@testing-library/user-event'
import type { UserEvent } from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Route, Routes } from 'react-router'

import { paths } from '@/config/paths'
import { renderWithRouter, screen, waitFor, within } from '@/test/test-utils'

import { getLesson, submitAttempt } from '../api/lesson-api'
import {
  attemptResultAllWrongResponse,
  attemptResultResponse,
  attemptResultWithRecordResponse,
  rc1ExpectedAnswer,
  rc1Rubric,
} from '../fixtures/attempt-result-fixtures'
import { attemptRejectedError, gradingUnavailableError } from '../fixtures/http-error-fixtures'
import {
  attemptFixture,
  conceptFixture,
  figureImageFixture,
  handsOnFixture,
  figureMermaidFixture,
  figureSvgFixture,
  hostileSvgFixture,
  lessonFixtures,
  malformedBlockFixture,
  newerVersionFixture,
  quizFixture,
  recallFixture,
  reviewFixture,
  raggedTableFixture,
  segmentsFixture,
  tableComparisonFixture,
  unknownBlockFixture,
  wideFigureFixture,
} from '../fixtures/lesson-fixtures'
import { parseAttemptResult } from '../schemas/attempt-schema'
import type { ParsedLessonResponse } from '../schemas/lesson-schema'
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

/**
 * The quiz as the payload wrote it, read from the fixture rather than from the
 * screen. Everything a neutrality assertion compares the rendered options against
 * comes from here, so the expectation is the lesson the backend sent and not a
 * restatement of whatever the renderer happened to do.
 */
type QuizQuestionPayload = {
  id: string
  prompt: string
  options: { id: string; text: string; feedback: string }[]
  correctOptionId: string
  explanation: string
}

function quizQuestions(): QuizQuestionPayload[] {
  return quizQuestionsFrom(quizFixture, 'the quiz fixture')
}

/**
 * The questions of whichever lesson the caller means, read from its fixture rather
 * than off the screen, so a payload assertion compares what the reader sent against
 * the lesson that was actually stored rather than restating the renderer's own
 * choices.
 */
function quizQuestionsFrom(fixture: ParsedLessonResponse, name: string): QuizQuestionPayload[] {
  const block = fixture.lesson.blocks.find(
    (candidate) => (candidate as { type?: string }).type === 'quiz',
  ) as { questions: QuizQuestionPayload[] } | undefined

  if (!block) {
    throw new Error(`${name} carries no quiz block`)
  }

  return block.questions
}

/**
 * What a learner hears as an option's name. A radio input carries no text of its
 * own; the words come from the label wrapped around it, which is also what
 * `:hover` and a click reach.
 */
function optionName(option: HTMLElement): string {
  return option.closest('label')?.textContent?.trim() ?? ''
}

/**
 * The whole of an option as markup, minus the two things that cannot carry the
 * answer: its text and its `id`.
 *
 * Text is the option's own words, and `id` is generated per element so dom ids are
 * unique — it says which option was rendered first, not which is right, and in the
 * fixture the right option is first, second and third. Everything else is compared
 * byte for byte: the element, its classes, every attribute, and every element
 * inside it. A `data-correct`, a second class, a checkmark, a different tag, an
 * extra wrapper, a reordered child — all of them make two options differ here.
 */
function optionSignature(element: Element): string {
  return element.outerHTML.replace(/\sid="[^"]*"/g, '').replace(/>[^<>]+</g, '><')
}

/**
 * One block of each of the nine types `docs/lesson-schema.json` fixes, in the
 * order the contract lists them. Hand-written rather than read from a fixture,
 * because the claim being tested is about the contract's set rather than about
 * any one stored lesson, and every word in it is a word a learner can be shown.
 */
function oneBlockOfEveryType(): unknown[] {
  return [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'A paragraph carrying one sentence.' }],
    },
    { type: 'heading', level: 2, text: 'A section heading' },
    { type: 'callout', tone: 'note', content: [{ type: 'text', text: 'A note about the move.' }] },
    { type: 'code', language: 'python', code: 'x = 2' },
    {
      type: 'figure',
      kind: 'image',
      source: 'https://example.org/moves.png',
      alt: 'A bar chart of the two moves.',
    },
    {
      type: 'table',
      headers: ['Method', 'What it does'],
      rows: [['Work backwards', 'Starts from the answer']],
    },
    {
      type: 'steps',
      title: 'Set up problem one, end to end',
      items: [{ id: 's1', instruction: 'Name the unknown.', check: 'One letter is written down.' }],
    },
    {
      type: 'quiz',
      questions: [
        {
          id: 'q1',
          prompt: 'Which move comes first?',
          options: [
            { id: 'a', text: 'Add four to both sides', feedback: 'That is the second move.' },
            { id: 'b', text: 'Subtract three from both sides', feedback: 'Exactly that.' },
            { id: 'c', text: 'Divide both sides by two', feedback: 'You cannot divide yet.' },
          ],
          correctOptionId: 'b',
          explanation: 'Undo addition before multiplication.',
        },
      ],
    },
    { type: 'recall', id: 'rc1', prompt: 'Why undo addition first?' },
  ]
}

type StepsPayload = {
  title: string
  items: { id: string; instruction: string; check: string }[]
}

/**
 * The checklist as the payload wrote it, read from the fixture rather than from
 * the screen, so a completeness assertion compares the render against the lesson
 * that was sent instead of restating whatever the renderer happened to produce.
 */
function handsOnSteps(): StepsPayload {
  return stepsBlockOf(handsOnFixture, 'the hands-on fixture')
}

function stepsBlockOf(fixture: unknown, name: string): StepsPayload {
  const block = (fixture as ParsedLessonResponse).lesson.blocks.find(
    (candidate) => (candidate as { type?: string }).type === 'steps',
  ) as StepsPayload | undefined

  if (!block) {
    throw new Error(`${name} carries no steps block`)
  }

  return block
}

type RecallPayload = { id: string; prompt: string }

/** Every recall prompt in a lesson, in the order the lesson wrote them. */
function recallsOf(fixture: ParsedLessonResponse): RecallPayload[] {
  return fixture.lesson.blocks.filter(
    (candidate) => (candidate as { type?: string }).type === 'recall',
  ) as RecallPayload[]
}

function attemptQuestions(): QuizQuestionPayload[] {
  return quizQuestionsFrom(attemptFixture, 'the attempt fixture')
}

function attemptSteps(): StepsPayload {
  return stepsBlockOf(attemptFixture, 'the attempt fixture')
}

/**
 * The attempt the reader sent, as the stubbed API function received it. Read off the
 * stub rather than off the mutation cache: the payload is the contract, so what
 * matters is what went out over the wire, not what the query layer is holding.
 */
function sentAttempts(): unknown[] {
  return vi.mocked(submitAttempt).mock.calls.map(([, attempt]) => attempt)
}

function firstSentAttempt(): { answers: unknown[] } {
  const attempt = sentAttempts()[0] as { answers: unknown[] } | undefined

  if (!attempt) {
    throw new Error('the learner never submitted an attempt')
  }

  return attempt
}

/** Answers of one variant, in the order they were sent. */
function answersOfType(attempt: { answers: unknown[] }, type: string): Record<string, unknown>[] {
  return attempt.answers.filter(
    (answer): answer is Record<string, unknown> =>
      typeof answer === 'object' && answer !== null && (answer as { type?: string }).type === type,
  )
}

function renderReader(lessonId = LESSON_ID, colorScheme?: 'light' | 'dark') {
  return renderWithRouter(
    <Routes>
      <Route path={paths.workspaces.lessonDetail.path} element={<LessonReader />} />
    </Routes>,
    [paths.workspaces.lessonDetail.getHref(WORKSPACE_ID, lessonId)],
    { colorScheme },
  )
}

/**
 * Every trace of executable content anywhere in the document, as a list a failure
 * can print: an element that runs or loads code, an attribute that is an event
 * handler, an animation that could rewrite an attribute into one, and any
 * attribute whose value is a script or data url once the whitespace and control
 * characters a browser ignores inside a scheme are taken out.
 *
 * The whole document rather than the lesson's container, because a figure that
 * escaped into a portal or into `<head>` would still be in the learner's page.
 * Empty is the only acceptable answer, in either colour scheme.
 */
function scriptTraces(): string[] {
  const traces: string[] = []
  const executable = new Set([
    'script',
    'iframe',
    'embed',
    'object',
    'foreignobject',
    'animate',
    'set',
    'handler',
  ])

  for (const element of document.documentElement.querySelectorAll('*')) {
    const tag = element.tagName.toLowerCase()

    if (executable.has(tag)) {
      traces.push(`<${tag}>`)
    }

    for (const { name, value } of Array.from(element.attributes)) {
      const scheme = value.replace(/[s -]/g, '').toLowerCase()

      if (name.toLowerCase().startsWith('on')) {
        traces.push(`<${tag} ${name}>`)
      }

      if (/^(javascript|vbscript|data):/.test(scheme)) {
        traces.push(`<${tag} ${name}="${value.slice(0, 40)}">`)
      }
    }
  }

  return traces
}

/**
 * The diagram of the given alt text, once mermaid has drawn it. The figure is on
 * the page, named and busy, from the first render; this waits for the busy state
 * to clear, which is the moment the drawing has landed in it.
 */
async function drawnDiagram(name: string): Promise<HTMLElement> {
  const figure = screen.getByRole('img', { name })

  await waitFor(() => expect(figure).not.toHaveAttribute('aria-busy'), { timeout: 30_000 })

  return figure
}

/** What the skipped-parts notice says each gap is, one line per gap, in lesson order. */
function skippedParts(notice: HTMLElement): string[] {
  return within(notice)
    .getAllByRole('listitem')
    .map((item) => item.textContent?.trim() ?? '')
}

/** The submit action at the foot of the lesson, named by its own words. */
function sendButton(): HTMLElement {
  return screen.getByRole('button', { name: 'Send my answers' })
}

/** The quiz question of the given id, as the learner finds it on the page. */
function questionGroup(question: QuizQuestionPayload): HTMLElement {
  return screen.getByRole('radiogroup', { name: question.prompt })
}

function recallBox(prompt: string): HTMLElement {
  return screen.getByRole('textbox', { name: prompt })
}

/**
 * Answers one question with the option the lesson says is right and another with one
 * it says is wrong, so a submit assertion covers both cases without restating which
 * option is which. The learner clicks options by their own text, the way a learner
 * would.
 */
async function pickOption(
  learner: UserEvent,
  question: QuizQuestionPayload,
  correct: boolean,
): Promise<QuizQuestionPayload['options'][number]> {
  const option = question.options.find((candidate) =>
    correct ? candidate.id === question.correctOptionId : candidate.id !== question.correctOptionId,
  )!

  await learner.click(within(questionGroup(question)).getByRole('radio', { name: option.text }))

  return option
}

describe('LessonReader', () => {
  beforeEach(() => {
    vi.mocked(getLesson).mockReset()
    vi.mocked(submitAttempt).mockReset()
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
    const notice = screen.getByRole('status', { name: 'Part of this lesson is missing' })
    expect(notice).toHaveTextContent('2 parts of this lesson could not be shown')

    // And told what each gap is, as far as the app can say: a type it has never
    // seen has no name it could give, so it says exactly that rather than guessing.
    expect(skippedParts(notice)).toEqual([
      'Something this version of the app does not know how to show',
      'Something this version of the app does not know how to show',
    ])

    // The type is logged once, not once per block: two blocks of the same unknown
    // type are one backend bug, and two identical lines would suggest two.
    const warnings = vi
      .mocked(console.warn)
      .mock.calls.map((call) => String(call[0]))
      .filter((message) => message.includes('unknown lesson block type'))
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('sandbox')
  })

  it('renders every block type the contract defines, so nothing in a lesson is ever skipped for want of a component', async () => {
    // One block of each of the nine types the contract fixes, in one lesson. A
    // type the app has no component for renders nothing and is counted as
    // skipped, so this is the test that says the build is not behind the format:
    // if a contract type ever loses its registry entry again, this lesson reads
    // with a gap in it and the learner is told.
    vi.mocked(getLesson).mockResolvedValue({
      ...conceptFixture,
      lesson: { ...conceptFixture.lesson, blocks: oneBlockOfEveryType() },
    })

    renderReader()

    await screen.findByRole('heading', { level: 1, name: 'Solving two-step equations' })

    for (const probe of [
      'A paragraph carrying one sentence.',
      'A section heading',
      'A note about the move',
      'x = 2',
      'Method',
      'Set up problem one, end to end',
      'Which move comes first?',
      'Why undo addition first?',
    ]) {
      expect(screen.getByText(probe, { exact: false })).toBeInTheDocument()
    }

    // The figure is named by its alt text rather than by words in the document,
    // because that is how a learner who cannot see it is told what it shows.
    expect(screen.getByRole('img', { name: 'A bar chart of the two moves.' })).toBeInTheDocument()

    expect(
      screen.queryByRole('status', { name: 'Part of this lesson is missing' }),
    ).not.toBeInTheDocument()
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

    // What was skipped is named, so "this lesson is short" and "a paragraph of
    // this lesson is missing" are not the same screen.
    const notice = screen.getByRole('status', { name: 'Part of this lesson is missing' })
    expect(notice).toHaveTextContent('One part of this lesson could not be shown')
    expect(skippedParts(notice)).toEqual(['A paragraph, in a shape this app cannot read'])
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
    expect(
      screen.getByText('This paragraph comes after the gap, and it renders.'),
    ).toBeInTheDocument()

    // A version bump says a block may have changed shape. The quiz this lesson
    // carries did, and the lesson also uses a type added after this app was
    // built: both are skipped, both are named, and nothing else is lost.
    const notice = screen.getByRole('status', { name: 'Part of this lesson is missing' })
    expect(skippedParts(notice)).toEqual([
      'A quiz, in a shape this app cannot read',
      'Something this version of the app does not know how to show',
    ])
  })

  it.each([
    ['prose', conceptFixture, 'Solving two-step equations'],
    ['a figure drawn as inline svg', figureSvgFixture, 'What one step looks like'],
    ['a figure that tried to run code', hostileSvgFixture, 'A figure the model was talked into'],
    ['a figure wider than the column', wideFigureFixture, 'A figure wider than the column'],
    ['a comparison table', tableComparisonFixture, 'Four ways to undo a step'],
    ['a table the model got wrong', raggedTableFixture, 'A table the model got slightly wrong'],
    ['a quiz with instant feedback', quizFixture, 'Checking the two moves'],
    ['a recall prompt', recallFixture, 'Saying it in your own words'],
    ['a hands-on checklist', handsOnFixture, 'Setting up the practice set'],
    ['a lesson with all three practice blocks in it', attemptFixture, 'Answers and the checklist'],
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

  it.each(['light', 'dark'] as const)(
    'renders a figure carrying a script, an event handler, or a script url with none of it in the page, in the %s scheme',
    async (scheme) => {
      vi.mocked(getLesson).mockResolvedValue(hostileSvgFixture)

      const { container } = renderReader(LESSON_ID, scheme)

      await screen.findByRole('heading', { level: 1, name: 'A figure the model was talked into' })
      // The scheme the learner would see, read off the page rather than assumed.
      expect(document.documentElement).toHaveAttribute('data-mantine-color-scheme', scheme)

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

      // Every other route the payload tried — a mixed-case and an encoded
      // `javascript:` scheme, an animation rewriting a link, html inside
      // `foreignObject`, a `data:` reference, embedding elements, an upper-case
      // handler — is gone from the whole document, not only from the figure.
      expect(scriptTraces()).toEqual([])

      // And nothing ran: the payload sets this from every one of those routes, so
      // an undefined value is the proof that none of them reached a browser that
      // executes them.
      expect((window as { __lessonPwned?: boolean }).__lessonPwned).toBeUndefined()
    },
  )

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

      // Before the drawing arrives the figure is already there, named by its alt
      // text and marked busy, so a learner reading past it hears what it will show
      // rather than meeting a gap, and a sighted one sees that something is coming.
      const name = 'Two boxes and an arrow, from 2x + 3 = 11 to x = 2'
      const waiting = screen.getByRole('img', { name })
      expect(waiting).toHaveAttribute('aria-busy', 'true')
      expect(waiting).toHaveTextContent('Drawing the diagram')

      // The drawing lands in that same element, so nothing is inserted above the
      // learner's place and the figure they may have focused or read past is still
      // the one that now holds the diagram.
      await waitFor(() => expect(waiting).toHaveTextContent('Add 4 to both sides'), {
        timeout: 30_000,
      })
      const diagram = screen.getByRole('img', { name })
      expect(diagram).toBe(waiting)
      expect(diagram).not.toHaveAttribute('aria-busy')

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

  it.each(['light', 'dark'] as const)(
    'draws a diagram as inert text, with no html label and nothing to click, in the %s scheme',
    async (scheme) => {
      vi.mocked(getLesson).mockResolvedValue(figureMermaidFixture)

      const { container } = renderReader(LESSON_ID, scheme)

      await screen.findByRole('heading', { level: 1, name: 'The move, as a diagram' })
      // Mermaid draws with a different theme in each scheme, so the dark drawing is
      // a different piece of markup from the light one and is checked on its own.
      expect(document.documentElement).toHaveAttribute('data-mantine-color-scheme', scheme)

      // Mermaid runs in strict mode with html labels off, so a label is words. The
      // payload's `<b>` stayed in the label as the four characters the learner sees,
      // and never became an element. See ADR-0001.
      const labelled = await drawnDiagram(
        'A diagram whose label carries markup and whose box carries a click',
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
      expect(scriptTraces()).toEqual([])
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
        await drawnDiagram('Two boxes and an arrow, from 2x + 3 = 11 to x = 2'),
      ).toHaveTextContent('Add 4 to both sides')
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

  it('shows every quiz question with every option it came with', async () => {
    vi.mocked(getLesson).mockResolvedValue(quizFixture)

    renderReader()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Checking the two moves' }),
    ).toBeInTheDocument()

    // Three questions, three radio groups, one each.
    expect(screen.getAllByRole('radiogroup')).toHaveLength(3)

    for (const question of quizQuestions()) {
      // Every question is on screen, named by its own words, with as many options as
      // the lesson wrote for it. A question the learner cannot see is a question
      // nobody can answer.
      const group = screen.getByRole('radiogroup', { name: question.prompt })
      expect(within(group).getAllByRole('radio')).toHaveLength(question.options.length)
      expect(screen.getByText(question.prompt)).toBeInTheDocument()
    }
  })

  it('tells the learner nothing about which option is right, before they answer', async () => {
    const learner = userEvent.setup()
    vi.mocked(getLesson).mockResolvedValue(quizFixture)

    renderReader()

    await screen.findByRole('heading', { level: 1, name: 'Checking the two moves' })

    const questions = quizQuestions()

    for (const question of questions) {
      const group = screen.getByRole('radiogroup', { name: question.prompt })
      const options = within(group).getAllByRole('radio')

      // One signature for every option, in this question and in every other: the
      // element, its classes, its attributes and what is inside it. If the renderer
      // marked the right option with a class, a `data-correct`, an `aria-describedby`,
      // a glyph, or a different tag, the signatures would come out different and
      // this would fail. Nothing here reads the payload's `correctOptionId`, so a
      // renderer that leaked the answer by any of those means fails whichever
      // question the learner looks at first.
      expect(new Set(options.map((option) => optionSignature(option))).size).toBe(1)
      expect(new Set(options.map((option) => optionSignature(option.closest('label')!))).size).toBe(
        1,
      )

      // Options in the order the lesson wrote them. An order worked out from
      // correctness would give the answer away with every option looking identical,
      // so the order is part of neutrality and not part of the layout.
      expect(options.map(optionName)).toEqual(question.options.map((option) => option.text))

      // Nothing is chosen yet, and nothing says anything is. The answer state is the
      // radio's own checkedness, which no attribute has to spell out for it.
      expect(options.filter((option) => (option as HTMLInputElement).checked)).toHaveLength(0)
      expect(options.every((option) => !option.closest('[data-checked]'))).toBe(true)

      // The options are the same length as each other. The backend made them so, and
      // a renderer that truncated one or padded another with an ellipsis would hand
      // the answer back in the line length.
      const wordCounts = options.map((option) => optionName(option).split(/\s+/).length)
      expect(new Set(wordCounts).size).toBe(1)

      // Nothing marks an option by pointing at it, so a hover cannot tell the learner
      // anything either. Every option carries the same class and the same one hover
      // rule, which is the whole of what makes a hovered option look like any other
      // hovered option.
      for (const option of options) {
        const hovered = optionSignature(option)

        await learner.hover(option)

        // The pointed-at option gained no class and no attribute, and no sibling
        // gained anything either.
        expect(optionSignature(option)).toBe(hovered)
        expect(options.map((other) => optionSignature(other))).toEqual(options.map(() => hovered))
      }
    }

    // The answer key is not in the document at all — not hidden, not collapsed, not
    // in a `title`, not in a tooltip waiting for a hover. A feedback string anywhere
    // in the page is something a learner can read before they have chosen, which is
    // the one thing this block must never do.
    for (const question of questions) {
      expect(screen.queryByText(question.explanation)).not.toBeInTheDocument()

      for (const option of question.options) {
        expect(screen.queryByText(option.feedback)).not.toBeInTheDocument()
      }
    }

    // And no wording has leaked either, in any colour scheme.
    expect(screen.queryByText('Correct')).not.toBeInTheDocument()
    expect(screen.queryByText('Not quite')).not.toBeInTheDocument()
  })

  it('lets a keyboard learner answer, through a radio group rather than a click handler', async () => {
    const learner = userEvent.setup()
    vi.mocked(getLesson).mockResolvedValue(quizFixture)

    renderReader()

    await screen.findByRole('heading', { level: 1, name: 'Checking the two moves' })

    const first = quizQuestions()[0]
    const group = screen.getByRole('radiogroup', { name: first.prompt })
    const options = within(group).getAllByRole('radio')

    // One tab stop for the whole question, the way a radio group is meant to work:
    // tabbed to rather than focused directly, so this proves the options are
    // reachable by keyboard at all.
    for (let presses = 0; presses < 20 && document.activeElement !== options[0]; presses += 1) {
      await learner.tab()
    }
    expect(options[0]).toHaveFocus()

    // Tabbing again leaves the question rather than walking through its options.
    await learner.tab()
    expect(group.contains(document.activeElement)).toBe(false)

    await options[0].focus()
    await learner.keyboard(' ')

    // Space chooses the option under the cursor, and the answer state is the
    // radio's own: exactly one option in the group is chosen, and it is the one the
    // keyboard was on.
    expect(options.filter((option) => (option as HTMLInputElement).checked)).toEqual([options[0]])

    // The arrow keys move through a question and choose as they go, which is what a
    // radio group is for. Moving from the first option lands on the second.
    await learner.keyboard('{ArrowDown}')

    expect(options[1]).toHaveFocus()
    expect(options.filter((option) => (option as HTMLInputElement).checked)).toEqual([options[1]])

    // And the arrow keys stay inside the question they belong to.
    await learner.keyboard('{ArrowUp}{ArrowUp}')

    expect(options[2]).toHaveFocus()
    expect(options[2]).toBeChecked()
  })

  it('answers the moment an option is picked, and lets the learner change their mind', async () => {
    const learner = userEvent.setup()
    vi.mocked(getLesson).mockResolvedValue(quizFixture)

    renderReader()

    await screen.findByRole('heading', { level: 1, name: 'Checking the two moves' })

    const [question, other] = quizQuestions()
    const group = screen.getByRole('radiogroup', { name: question.prompt })
    const right = question.options.find((option) => option.id === question.correctOptionId)!
    const wrong = question.options.find((option) => option.id !== question.correctOptionId)!

    // Before an answer there is a live region for this question and it is empty, so
    // it announces nothing on load and something the moment it is answered.
    const feedback = screen.getByRole('status', { name: question.prompt })
    expect(feedback).toBeEmptyDOMElement()
    expect(feedback).toHaveAttribute('aria-live', 'polite')

    await learner.click(within(group).getByRole('radio', { name: wrong.text }))

    // The answer landed in that same live region, which is what announces it.
    expect(screen.getByRole('status', { name: question.prompt })).toHaveTextContent(wrong.feedback)
    expect(feedback).toHaveAttribute('aria-live', 'polite')

    // That option's own feedback, and the question's explanation after it.
    const note = within(feedback).getByRole('note')
    expect(note).toHaveTextContent(wrong.feedback)
    expect(note).toHaveTextContent(question.explanation)
    expect(
      note.compareDocumentPosition(within(note).getByText(question.explanation, { exact: false })) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()

    // Right or wrong is said in words, and marked with a glyph as well as a colour,
    // so a learner who cannot see either still knows where they landed.
    expect(note).toHaveAccessibleName('Not quite')
    expect(note.textContent).toContain('✗')

    // The other questions said nothing, and nothing leaked from them either.
    expect(screen.getByRole('status', { name: other.prompt })).toBeEmptyDOMElement()

    // Changing the answer before submitting is allowed, and the learner sees the
    // answer they changed to rather than both answers at once.
    await learner.click(within(group).getByRole('radio', { name: right.text }))

    expect(within(feedback).getByRole('note')).toHaveAccessibleName('Correct')
    expect(within(feedback).getByRole('note')).toHaveTextContent(right.feedback)
    expect(within(feedback).getByRole('note')).not.toHaveTextContent(wrong.feedback)
    expect(within(feedback).getByRole('note').textContent).toContain('✓')
    expect(screen.getByRole('status', { name: question.prompt })).toHaveTextContent(
      question.explanation,
    )
    expect(
      within(group)
        .getAllByRole('radio')
        .filter((o) => (o as HTMLInputElement).checked),
    ).toHaveLength(1)
  })

  it('shows every recall prompt as a labelled text area a learner can type into', async () => {
    vi.mocked(getLesson).mockResolvedValue(recallFixture)

    renderReader()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Saying it in your own words' }),
    ).toBeInTheDocument()

    // Two prompts, two text areas, each named by its own words. A recall block
    // whose prompt is not the accessible name of its control is a prompt a
    // learner using a screen reader cannot tie to the box they are filling in.
    const boxes = screen.getAllByRole('textbox')
    expect(boxes).toHaveLength(2)
    expect(boxes[0]).toHaveAccessibleName(
      'In your own words, why do you undo addition before you undo multiplication?',
    )
    expect(boxes[1]).toHaveAccessibleName('In your own words, what makes an equation checkable?')

    // A real association, not a placeholder: a `<label for>` pointing at the
    // control, so clicking the words focuses it and the browser's own
    // association is what a screen reader reads.
    const prompt = screen.getByText(
      'In your own words, why do you undo addition before you undo multiplication?',
    )
    expect(prompt.tagName).toBe('LABEL')
    expect(prompt).toHaveAttribute('for', boxes[0].id)

    // Both prompts start empty: there is no draft anybody else left behind.
    expect(boxes[0]).toHaveValue('')
    expect(boxes[1]).toHaveValue('')
  })

  it('puts no expected answer and no rubric anywhere in the lesson, before the learner submits', async () => {
    // A response that leaked them, which is what the contract says must not
    // happen. The reader is not the layer that removes them, so this asserts the
    // page rather than the payload: whatever arrives, no expected answer and no
    // rubric line reaches the document while the learner is reading.
    const modelAnswer =
      'Because 2 is multiplying the whole left side, so the 3 has to come off first.'
    const rubric = ['Mentions multiplication by 2', 'Mentions order matters']

    vi.mocked(getLesson).mockResolvedValue({
      ...recallFixture,
      lesson: {
        ...recallFixture.lesson,
        blocks: [
          {
            type: 'recall',
            id: 'rc1',
            prompt: 'Why undo addition first?',
            modelAnswer,
            rubric,
          },
        ],
      },
    })

    const { container } = renderReader()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Saying it in your own words' }),
    ).toBeInTheDocument()

    // The prompt still renders and is still answerable.
    expect(screen.getByRole('textbox')).toHaveAccessibleName('Why undo addition first?')

    // The answer key is not in the document at all: not visible, not hidden, not in
    // a `title`, not in an attribute, not in the markup. A rubric line a learner
    // can read is the grading scheme for a question they have not been asked yet.
    //
    // Compared against every character of text the page shows and every character
    // of its markup, rather than by querying for each string as an element's
    // whole content. A renderer that spliced the answer into a sentence, or split
    // it across two nodes, would slip past a query for the string on its own and
    // past an assertion about one element.
    const shown = document.body.textContent ?? ''
    expect(shown).not.toContain(modelAnswer)
    for (const line of rubric) {
      expect(shown).not.toContain(line)
    }
    expect(container.innerHTML).not.toContain(modelAnswer)
    expect(container.innerHTML).not.toContain('rubric')
    expect(container.innerHTML).not.toContain('modelAnswer')
  })

  it('keeps a typed recall answer when the lesson reads further on and comes back', async () => {
    const learner = userEvent.setup()
    vi.mocked(getLesson).mockResolvedValue(recallFixture)

    renderReader()

    await screen.findByRole('heading', { level: 1, name: 'Saying it in your own words' })

    const box = screen.getAllByRole('textbox')[0]
    const answer = 'Because two is multiplying the whole left side, not just the x.'

    // Typed one character at a time. Every keystroke changes the answer, which is
    // a render of this block each time — so if the state the block keeps were
    // cleared on anything other than the block going away, the second character
    // would be typed into an empty box and the sentence would arrive one letter at
    // a time in the history and nothing like this in the field.
    await learner.type(box, answer)
    expect(box).toHaveValue(answer)

    // Read past it: the closing paragraph is below, which is where the learner
    // goes for the next minute.
    const last = screen.getByText('Read them back to yourself afterwards.', { exact: false })
    window.scrollTo(0, last.getBoundingClientRect().bottom + window.scrollY)
    expect(last).toBeVisible()

    // Come back to the first prompt by tabbing from the top of the lesson rather
    // than by reaching for the element, the way a learner who has scrolled would
    // get there. Focusing it is a render of the block, and losing focus again is
    // another, so this is the round trip the answer has to survive.
    const second = screen.getAllByRole('textbox')[1]
    await learner.click(second)
    await learner.tab({ shift: true })
    expect(box).toHaveFocus()
    expect(box).toHaveValue(answer)

    // And the second prompt is still its own empty box: two prompts in one lesson
    // are two answers, not one answer written twice.
    expect(second).toHaveValue('')
  })

  it('shows a hands-on lesson as a checklist: a title, an instruction per step, and how the learner knows it is done', async () => {
    vi.mocked(getLesson).mockResolvedValue(handsOnFixture)

    renderReader()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Setting up the practice set' }),
    ).toBeInTheDocument()

    const { title, items } = handsOnSteps()

    // A checklist, not explanation: one tickable control per step the lesson
    // wrote, named by its own instruction, and nothing extra.
    const boxes = screen.getAllByRole('checkbox')
    expect(boxes).toHaveLength(items.length)
    for (const item of items) {
      expect(screen.getByRole('checkbox', { name: item.instruction })).toBeInTheDocument()
    }

    // Every step says how the learner will know it is done. A step with no check
    // is a step the learner cannot tell they have finished.
    for (const item of items) {
      expect(screen.getByText(item.check, { exact: false })).toBeInTheDocument()
    }

    // The block's title, and the checklist it introduces is named by it, so a
    // screen reader can say which list a step belongs to.
    expect(screen.getByText(title).tagName).toMatch(/^H[1-6]$/)
    const group = screen.getByRole('group', { name: title })
    expect(within(group).getAllByRole('checkbox')).toHaveLength(items.length)

    // It is a real checkbox per step rather than a styled div: keyboard operable,
    // and the answer state is the control's own.
    for (const box of boxes) {
      expect(box.tagName).toBe('INPUT')
      expect((box as HTMLInputElement).type).toBe('checkbox')
      expect((box as HTMLInputElement).checked).toBe(false)
    }
  })

  it('ticks and unticks a step from the keyboard, and reads done as a tick and as words', async () => {
    const learner = userEvent.setup()
    vi.mocked(getLesson).mockResolvedValue(handsOnFixture)

    renderReader()

    await screen.findByRole('heading', { level: 1, name: 'Setting up the practice set' })

    const [first] = handsOnSteps().items
    const box = screen.getByRole('checkbox', { name: first.instruction })
    const row = box.closest('label')!

    // Tabbed to rather than focused directly, so this proves a step is reachable
    // by keyboard at all and not merely operable once focused.
    for (let presses = 0; presses < 25 && document.activeElement !== box; presses += 1) {
      await learner.tab()
    }
    expect(box).toHaveFocus()

    await learner.keyboard(' ')

    // Space ticks it, and the state is the control's own checkedness — which is
    // what a screen reader announces, so done is never carried by colour alone.
    expect(box).toBeChecked()
    // And in words too, so a learner who cannot perceive the tick at all still
    // knows where they are in the checklist.
    expect(row.textContent).toContain('Done')

    // The other steps are untouched: one step's progress is not every step's.
    const others = screen
      .getAllByRole('checkbox')
      .filter((candidate) => candidate !== box) as HTMLInputElement[]
    expect(others.every((other) => !other.checked)).toBe(true)

    await learner.keyboard(' ')

    expect(box).not.toBeChecked()
    expect(row.textContent).not.toContain('Done')
  })

  it('keeps ticked steps when the lesson reads further on and comes back', async () => {
    const learner = userEvent.setup()
    vi.mocked(getLesson).mockResolvedValue(handsOnFixture)

    renderReader()

    await screen.findByRole('heading', { level: 1, name: 'Setting up the practice set' })

    const steps = handsOnSteps()
    const [first, second] = steps.items

    await learner.click(screen.getByRole('checkbox', { name: first.instruction }))
    await learner.click(screen.getByRole('checkbox', { name: second.instruction }))

    // Read past the checklist: the warning callout, the code, and the closing
    // note are all below it.
    expect(
      screen.getByText('If your equation needs the unknown on both sides, stop.', { exact: false }),
    ).toBeInTheDocument()

    // Come back, and the ticks are still where the learner left them.
    expect(screen.getByRole('checkbox', { name: first.instruction })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: second.instruction })).toBeChecked()
    expect(
      (screen.getByRole('checkbox', { name: steps.items[2].instruction }) as HTMLInputElement)
        .checked,
    ).toBe(false)
  })

  it('offers one submit action at the end of the lesson, disabled with a reason while there is nothing to send', async () => {
    vi.mocked(getLesson).mockResolvedValue(attemptFixture)

    renderReader()

    await screen.findByRole('heading', { level: 1, name: 'Answers and the checklist' })

    const send = sendButton()

    expect(send).toBeInTheDocument()
    expect(send).toBeDisabled()

    // The reason is on the page in words, not left to be inferred from a control that
    // will not respond. A learner cannot act on a disabled button nobody explains.
    expect(
      screen.getByText(/Ticking a step is not an answer: steps are not graded/),
    ).toBeInTheDocument()
  })

  it('does not let a ticked checklist on its own be sent, because steps are ungraded telemetry', async () => {
    const learner = userEvent.setup()
    vi.mocked(getLesson).mockResolvedValue(attemptFixture)

    renderReader()

    await screen.findByRole('heading', { level: 1, name: 'Answers and the checklist' })

    // Every single step in the lesson ticked, and no answer anywhere.
    for (const item of attemptSteps().items) {
      await learner.click(screen.getByRole('checkbox', { name: item.instruction }))
    }

    expect(screen.getAllByRole('checkbox').every((box) => (box as HTMLInputElement).checked)).toBe(
      true,
    )
    expect(sendButton()).toBeDisabled()
    expect(sendButton()).toHaveAccessibleDescription(/steps are not graded/)

    // And the learner cannot get it sent by clicking it anyway.
    await learner.click(sendButton())

    expect(vi.mocked(submitAttempt)).not.toHaveBeenCalled()
  })

  it('sends one attempt holding the quiz picks, the recall answers, and a done flag for every step including untouched ones', async () => {
    const learner = userEvent.setup()
    vi.mocked(getLesson).mockResolvedValue(attemptFixture)
    vi.mocked(submitAttempt).mockResolvedValue(parseAttemptResult(attemptResultResponse))

    renderReader()

    await screen.findByRole('heading', { level: 1, name: 'Answers and the checklist' })

    const [first, second] = attemptQuestions()
    const [rc1] = recallsOf(attemptFixture)
    const steps = attemptSteps()

    await pickOption(learner, first, true)
    await pickOption(learner, second, false)
    // The third question is never answered at all.
    await learner.type(recallBox(rc1.prompt), 'Because the 2 multiplies whatever is left.')
    await learner.click(screen.getByRole('checkbox', { name: steps.items[0].instruction }))
    // The second step is ticked and then unticked, which is not the same as never
    // having touched it: an explicit `false` rather than an absent entry.

    const secondBox = screen.getByRole('checkbox', { name: steps.items[1].instruction })
    await learner.click(secondBox)
    await learner.click(secondBox)

    expect(sendButton()).toBeEnabled()
    await learner.click(sendButton())

    await screen.findByRole('heading', { level: 2, name: 'How your answers went' })

    // What the stubbed API function received, which is the contract. Asserted at the
    // screen seam rather than against the mutation cache, because the payload is
    // what went over the wire and the cache is only a copy of it.
    expect(vi.mocked(submitAttempt)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(submitAttempt).mock.calls[0][0]).toBe(LESSON_ID)

    const attempt = firstSentAttempt()
    const quiz = answersOfType(attempt, 'quiz')
    expect(quiz.map((answer) => answer.questionId)).toEqual([first.id, second.id])
    expect(quiz[0]).toMatchObject({ questionId: first.id, optionId: first.correctOptionId })
    expect(quiz[1]).toMatchObject({ questionId: second.id })
    expect(quiz[1].optionId).not.toBe(second.correctOptionId)

    const recall = answersOfType(attempt, 'recall')
    expect(recall).toEqual([
      { type: 'recall', recallId: rc1.id, text: 'Because the 2 multiplies whatever is left.' },
    ])

    // Every step the lesson has, in the lesson's order, each with an explicit flag.
    // s3 was never touched and s2 was unticked, and both are sent as `false`: the
    // contract's telemetry distinguishes a step left undone from a step that was
    // never opened, and only the lesson knows which steps exist.
    expect(answersOfType(attempt, 'steps')).toEqual([
      { type: 'steps', stepId: steps.items[0].id, done: true },
      { type: 'steps', stepId: steps.items[1].id, done: false },
      { type: 'steps', stepId: steps.items[2].id, done: false },
    ])

    // Nothing was sent that is not one of the three variants, so a blank recall can
    // never have been shaped like a quiz answer.
    expect(attempt.answers.map((answer) => (answer as { type: string }).type).sort()).toEqual([
      'quiz',
      'quiz',
      'recall',
      'steps',
      'steps',
      'steps',
    ])
  })

  it('omits a question the learner never answered, rather than sending it as a blank', async () => {
    const learner = userEvent.setup()
    vi.mocked(getLesson).mockResolvedValue(attemptFixture)
    vi.mocked(submitAttempt).mockResolvedValue(parseAttemptResult(attemptResultResponse))

    renderReader()

    await screen.findByRole('heading', { level: 1, name: 'Answers and the checklist' })

    const [, , skipped] = attemptQuestions()
    const [, untouchedRecall] = recallsOf(attemptFixture)

    // One answer, and it is the first question. Two questions and one prompt are left
    // completely alone.
    await pickOption(learner, attemptQuestions()[0], true)

    await learner.click(sendButton())

    await screen.findByRole('heading', { level: 2, name: 'How your answers went' })

    const attempt = firstSentAttempt()

    // Omission, not a blank. A skipped answer means skipped in the contract, and it
    // is excluded from grading; an empty `optionId` would instead be a malformed
    // answer for a question the learner never saw an answer key for.
    expect(answersOfType(attempt, 'quiz').map((answer) => answer.questionId)).not.toContain(
      skipped.id,
    )
    expect(answersOfType(attempt, 'recall')).toEqual([])
    expect(untouchedRecall).toBeDefined()

    // The untouched question is still on the page, unanswered, rather than gone. It
    // is skipped in the attempt and it is still there to be seen.
    expect(within(questionGroup(skipped)).getAllByRole('radio')).toHaveLength(
      skipped.options.length,
    )
    expect(recallBox(untouchedRecall.prompt)).toHaveValue('')
  })

  it('sends a recall the learner cleared as an empty recall answer, which is not the same as skipped', async () => {
    const learner = userEvent.setup()
    vi.mocked(getLesson).mockResolvedValue(attemptFixture)
    vi.mocked(submitAttempt).mockResolvedValue(parseAttemptResult(attemptResultResponse))

    renderReader()

    await screen.findByRole('heading', { level: 1, name: 'Answers and the checklist' })

    const [rc1, rc2] = recallsOf(attemptFixture)

    // Typed and then deleted. The learner reached the prompt and then decided they had
    // nothing to say, which is a different fact from never opening it.
    const box = recallBox(rc1.prompt)
    await learner.type(box, 'Something.')
    await learner.clear(box)
    expect(box).toHaveValue('')

    await learner.click(sendButton())

    await screen.findByRole('heading', { level: 2, name: 'How your answers went' })

    const recall = answersOfType(firstSentAttempt(), 'recall')

    // Present, with an empty string, and shaped as a recall: the union keeps a blank
    // answer from ever being mistaken for a malformed quiz answer. The untouched
    // prompt is still absent.
    expect(recall).toEqual([{ type: 'recall', recallId: rc1.id, text: '' }])
    expect(recall.map((answer) => answer.recallId)).not.toContain(rc2.id)
  })

  it('shows feedback per answer once the attempt comes back, marked in words and a glyph as well as colour', async () => {
    const learner = userEvent.setup()
    vi.mocked(getLesson).mockResolvedValue(attemptFixture)
    vi.mocked(submitAttempt).mockResolvedValue(parseAttemptResult(attemptResultResponse))

    renderReader()

    await screen.findByRole('heading', { level: 1, name: 'Answers and the checklist' })

    await pickOption(learner, attemptQuestions()[0], true)
    await pickOption(learner, attemptQuestions()[1], false)
    await learner.type(recallBox(recallsOf(attemptFixture)[0].prompt), 'Because order is fixed.')

    await learner.click(sendButton())

    const result = await screen.findByRole('heading', { level: 2, name: 'How your answers went' })
    const region = result.closest('section')!

    // Three graded answers came back, so three notes. Each names the question it is
    // about, which is how a learner finds the one they care about.
    expect(within(region).getAllByRole('note')).toHaveLength(3)
    expect(
      within(region).getByText(attemptQuestions()[0].prompt, { exact: false }),
    ).toBeInTheDocument()

    // The learner's own words are in the result too: a result the learner cannot match
    // against what they wrote is a result about some other attempt.
    expect(region).toHaveTextContent('Because order is fixed.')

    // Two of the three came back right and one did not, and each is marked by its own
    // word and its own glyph. The glyph is decoration: the word is what a screen
    // reader reads, and neither the word nor the glyph is signalled by colour alone.
    const right = within(region).getAllByRole('note', { name: 'Correct' })
    const wrong = within(region).getAllByRole('note', { name: 'Not quite' })

    expect(right).toHaveLength(2)
    expect(wrong).toHaveLength(1)
    expect(right.every((note) => note.textContent?.includes('✓'))).toBe(true)
    expect(wrong[0].textContent).toContain('✗')
  })

  it('works the summary out from what came back, and counts the checklist nowhere', async () => {
    const learner = userEvent.setup()
    vi.mocked(getLesson).mockResolvedValue(attemptFixture)
    vi.mocked(submitAttempt).mockResolvedValue(parseAttemptResult(attemptResultResponse))

    renderReader()

    await screen.findByRole('heading', { level: 1, name: 'Answers and the checklist' })

    const steps = attemptSteps()
    // Every step ticked, so a summary that counted telemetry would report five graded
    // items rather than the three that came back.
    for (const item of steps.items) {
      await learner.click(screen.getByRole('checkbox', { name: item.instruction }))
    }

    await pickOption(learner, attemptQuestions()[0], true)
    await pickOption(learner, attemptQuestions()[1], false)
    await learner.type(recallBox(recallsOf(attemptFixture)[0].prompt), 'Because order is fixed.')

    await learner.click(sendButton())

    const result = await screen.findByRole('heading', { level: 2, name: 'How your answers went' })
    const region = result.closest('section')!

    // Two of the three returned entries were right. The arithmetic is the frontend's
    // because the contract carries no score, and it is arithmetic over `perAnswer`
    // only.
    expect(region).toHaveTextContent('2 of 3 answers right.')

    // Two graded items were skipped — the third question and the second prompt — and
    // the summary says so rather than pretending they were wrong or pretending they
    // do not exist.
    expect(region).toHaveTextContent('2 answers were skipped, and a skipped answer is not graded.')

    // Announced as it arrives, in a live region, and only the sentence: the breakdown
    // is content the learner navigates to rather than a wall of speech on submit.
    const announced = within(region).getByRole('status')
    expect(announced).toHaveTextContent('2 of 3 answers right.')

    // The checklist is named as not being part of the count, so a learner who ticked
    // three boxes and is told about two answers does not conclude their ticks vanished.
    expect(region).toHaveTextContent(
      'Your checklist is not in this count. Steps are not graded, so they contribute nothing to it.',
    )
  })

  it('takes the verdict from what came back rather than recomputing it from the learner answers', async () => {
    const learner = userEvent.setup()
    vi.mocked(getLesson).mockResolvedValue(attemptFixture)
    vi.mocked(submitAttempt).mockResolvedValue(parseAttemptResult(attemptResultAllWrongResponse))

    renderReader()

    await screen.findByRole('heading', { level: 1, name: 'Answers and the checklist' })

    // The learner picks the option the lesson calls correct. The stubbed result marks
    // it wrong anyway, and the reader has no business overruling the backend: whether
    // an answer is right is the backend's judgement, not a thing the frontend rederives
    // from a `correctOptionId` it happens to have.
    await pickOption(learner, attemptQuestions()[0], true)

    await learner.click(sendButton())

    const result = await screen.findByRole('heading', { level: 2, name: 'How your answers went' })
    const region = result.closest('section')!

    expect(region).toHaveTextContent('0 of 1 answer right.')
    expect(within(region).getByRole('note', { name: 'Not quite' })).toBeInTheDocument()
  })

  it('shows a recall expected answer and its rubric only once the attempt has come back', async () => {
    const learner = userEvent.setup()
    vi.mocked(getLesson).mockResolvedValue(attemptFixture)
    vi.mocked(submitAttempt).mockResolvedValue(parseAttemptResult(attemptResultResponse))

    const { container } = renderReader()

    await screen.findByRole('heading', { level: 1, name: 'Answers and the checklist' })

    await learner.type(recallBox(recallsOf(attemptFixture)[0].prompt), 'Because order is fixed.')

    // Before submitting, neither the expected answer nor either rubric line is
    // anywhere in the document. Not hidden, not in an attribute, not in the markup: a
    // rubric a learner can read before answering is a grading scheme for a question
    // they have not been asked.
    const beforeSubmit = document.body.textContent ?? ''
    expect(beforeSubmit).not.toContain(rc1ExpectedAnswer)
    for (const line of rc1Rubric) {
      expect(beforeSubmit).not.toContain(line)
    }
    expect(container.innerHTML).not.toContain('modelAnswer')

    await learner.click(sendButton())

    const result = await screen.findByRole('heading', { level: 2, name: 'How your answers went' })
    const region = result.closest('section')!

    // After submitting they are here, labelled as what they are, so the learner can
    // compare their own sentence against them.
    expect(region).toHaveTextContent(rc1ExpectedAnswer)
    for (const line of rc1Rubric) {
      expect(region).toHaveTextContent(line)
    }
    expect(region).toHaveTextContent('Feedback on your answer:')

    // The prompt they wrote this against is named, so a result about rc1 is findable
    // in a lesson with more than one prompt in it.
    expect(region).toHaveTextContent(recallsOf(attemptFixture)[0].prompt)
  })

  it('says quietly that progress was recorded, and says nothing at all when it was not', async () => {
    const learner = userEvent.setup()
    vi.mocked(getLesson).mockResolvedValue(attemptFixture)
    vi.mocked(submitAttempt).mockResolvedValue(parseAttemptResult(attemptResultResponse))

    const withoutRecord = renderReader()

    await screen.findByRole('heading', { level: 1, name: 'Answers and the checklist' })

    await pickOption(learner, attemptQuestions()[0], true)
    await learner.click(sendButton())

    await screen.findByRole('heading', { level: 2, name: 'How your answers went' })

    // No candidate came back, so there is no note — and no "not this time" in its
    // place either. Telling a learner they were not understood is a judgement the
    // reader does not make.
    expect(screen.queryByRole('note', { name: 'Kept as a record' })).not.toBeInTheDocument()
    expect(screen.queryByText(/recorded/i)).not.toBeInTheDocument()

    // Leaving the page ends the visit, so the second render starts a fresh one rather
    // than showing the first attempt's result — the same lifecycle the answer maps
    // have, which is why unmounting is enough here.
    withoutRecord.unmount()

    vi.mocked(submitAttempt).mockResolvedValue(parseAttemptResult(attemptResultWithRecordResponse))

    const withRecord = renderReader()

    await screen.findByRole('heading', { level: 1, name: 'Answers and the checklist' })

    await pickOption(learner, attemptQuestions()[0], true)
    await learner.click(sendButton())

    const note = await screen.findByRole('note', { name: 'Kept as a record' })

    // The backend's own words, all three: what it recorded, and what in the answers
    // supports it. Nothing here congratulates the learner or claims to understand them,
    // because whether this attempt is evidence of understanding is not the reader's
    // call.
    expect(note).toHaveTextContent('Explains why the order of the two moves is fixed')
    expect(note).toHaveTextContent('Ada said it in her own words, unprompted')
    expect(note).toHaveTextContent(
      'Because: rc1 asked for the reason the order is fixed, and the answer names the whole left side the 3 is added to.',
    )
    expect(note.textContent).not.toMatch(/well done|great work|congratulat/i)

    withRecord.unmount()
  })

  it('reports a failed attempt and keeps every answer, so a retry costs no retyping', async () => {
    const learner = userEvent.setup()
    vi.mocked(getLesson).mockResolvedValue(attemptFixture)
    vi.mocked(submitAttempt)
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValue(parseAttemptResult(attemptResultResponse))

    renderReader()

    await screen.findByRole('heading', { level: 1, name: 'Answers and the checklist' })

    const [rc1, rc2] = recallsOf(attemptFixture)
    const steps = attemptSteps()
    const typed = 'Because the 2 multiplies whatever is left.'

    await pickOption(learner, attemptQuestions()[0], true)
    await learner.type(recallBox(rc1.prompt), typed)
    await learner.click(screen.getByRole('checkbox', { name: steps.items[0].instruction }))

    await learner.click(sendButton())

    expect(await screen.findByText('Your answers were not sent')).toBeInTheDocument()
    expect(screen.getByText(/Nothing was lost/)).toBeInTheDocument()

    // Every answer is still exactly where the learner left it: the quiz pick, the
    // typed sentence, and the tick. Nothing was cleared on the way out, so a retry is
    // one press rather than a retyping.
    expect(recallBox(rc1.prompt)).toHaveValue(typed)
    expect(recallBox(rc2.prompt)).toHaveValue('')
    expect(
      within(questionGroup(attemptQuestions()[0]))
        .getAllByRole('radio')
        .filter((radio) => (radio as HTMLInputElement).checked),
    ).toHaveLength(1)
    expect(screen.getByRole('checkbox', { name: steps.items[0].instruction })).toBeChecked()

    // And the retry sends the same attempt, because the answers were never lost.
    await learner.click(screen.getByRole('button', { name: 'Try again' }))

    await screen.findByRole('heading', { level: 2, name: 'How your answers went' })

    expect(vi.mocked(submitAttempt)).toHaveBeenCalledTimes(2)
    expect(sentAttempts()[1]).toEqual(sentAttempts()[0])
    expect(recallBox(rc1.prompt)).toHaveValue(typed)
  })

  it('names the option the learner chose by its words, not by its letter', async () => {
    const learner = userEvent.setup()
    vi.mocked(getLesson).mockResolvedValue(attemptFixture)
    vi.mocked(submitAttempt).mockResolvedValue(parseAttemptResult(attemptResultResponse))

    renderReader()

    await screen.findByRole('heading', { level: 1, name: 'Answers and the checklist' })

    const chosen = await pickOption(learner, attemptQuestions()[0], true)
    await learner.click(sendButton())

    const result = await screen.findByRole('heading', { level: 2, name: 'How your answers went' })
    const region = result.closest('section')!

    expect(region).toHaveTextContent(`You chose: ${chosen.text}`)
    expect(region).not.toHaveTextContent(`You chose: ${chosen.id}`)
  })

  it('asks for the same answers again when the grader is unavailable, and keeps them', async () => {
    const learner = userEvent.setup()
    vi.mocked(getLesson).mockResolvedValue(attemptFixture)
    vi.mocked(submitAttempt)
      .mockRejectedValueOnce(gradingUnavailableError())
      .mockResolvedValue(parseAttemptResult(attemptResultResponse))

    renderReader()

    await screen.findByRole('heading', { level: 1, name: 'Answers and the checklist' })

    const [rc1] = recallsOf(attemptFixture)
    const typed = 'Because the 2 multiplies whatever is left.'

    await pickOption(learner, attemptQuestions()[0], true)
    await learner.type(recallBox(rc1.prompt), typed)
    await learner.click(sendButton())

    expect(await screen.findByText('Your answers could not be graded just now')).toBeInTheDocument()
    expect(screen.getByText(/Send the same answers again/)).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { level: 2, name: 'How your answers went' }),
    ).not.toBeInTheDocument()
    expect(recallBox(rc1.prompt)).toHaveValue(typed)

    await learner.click(screen.getByRole('button', { name: 'Try again' }))

    await screen.findByRole('heading', { level: 2, name: 'How your answers went' })
    expect(sentAttempts()[1]).toEqual(sentAttempts()[0])
  })

  it('treats a refused attempt as not graded, offers no retry, and keeps the answers', async () => {
    const learner = userEvent.setup()
    vi.mocked(getLesson).mockResolvedValue(attemptFixture)
    vi.mocked(submitAttempt).mockRejectedValueOnce(attemptRejectedError())

    renderReader()

    await screen.findByRole('heading', { level: 1, name: 'Answers and the checklist' })

    const [rc1] = recallsOf(attemptFixture)
    const typed = 'Because order is fixed.'

    await pickOption(learner, attemptQuestions()[0], true)
    await learner.type(recallBox(rc1.prompt), typed)
    await learner.click(sendButton())

    expect(await screen.findByText('Your answers were not accepted')).toBeInTheDocument()
    expect(screen.getByText(/a fault in the app rather than in your answers/)).toBeInTheDocument()

    // Not a result: no summary, no verdicts, nothing that reads as graded.
    expect(
      screen.queryByRole('heading', { level: 2, name: 'How your answers went' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('note', { name: 'Not quite' })).not.toBeInTheDocument()

    // The same request would be refused the same way, so nothing offers to send it.
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
    expect(recallBox(rc1.prompt)).toHaveValue(typed)
  })

  it('keeps a submitted attempt on screen with the answers locked, and says that they are locked', async () => {
    const learner = userEvent.setup()
    vi.mocked(getLesson).mockResolvedValue(attemptFixture)
    vi.mocked(submitAttempt).mockResolvedValue(parseAttemptResult(attemptResultResponse))

    renderReader()

    await screen.findByRole('heading', { level: 1, name: 'Answers and the checklist' })

    const [rc1] = recallsOf(attemptFixture)
    const steps = attemptSteps()
    const typed = 'Because the 2 multiplies whatever is left.'

    await pickOption(learner, attemptQuestions()[0], true)
    await learner.type(recallBox(rc1.prompt), typed)
    await learner.click(screen.getByRole('checkbox', { name: steps.items[0].instruction }))

    await learner.click(sendButton())

    await screen.findByRole('heading', { level: 2, name: 'How your answers went' })

    // The attempt stays: one attempt, one result, and the learner reads it here rather
    // than being sent somewhere else to find out how they did.
    expect(screen.getByRole('heading', { level: 2, name: 'How your answers went' })).toBeVisible()
    // Including the recall feedback, so the learner is reading the whole result rather
    // than being handed a bare summary and a set of empty boxes.
    expect(screen.getByText(new RegExp(rc1ExpectedAnswer.split('.')[0]))).toBeInTheDocument()

    // There is no second submit action, because there is no second attempt to make.
    expect(screen.queryByRole('button', { name: 'Send my answers' })).not.toBeInTheDocument()

    // Every control that took an answer refuses a new one, and each says so in words.
    // Locking silently would look like a broken app rather than a finished attempt.
    const radios = within(questionGroup(attemptQuestions()[0])).getAllByRole('radio')
    expect(radios.every((radio) => (radio as HTMLInputElement).disabled)).toBe(true)
    expect(recallBox(rc1.prompt)).toHaveAttribute('readonly')
    expect(screen.getAllByRole('checkbox').every((box) => (box as HTMLInputElement).disabled)).toBe(
      true,
    )

    const lockNotes = screen.getAllByText(/Your answers are locked, and they stay on screen/)
    expect(lockNotes.length).toBeGreaterThanOrEqual(3)

    // The answers themselves are still readable, which is the point of locking rather
    // than clearing: the learner can check what they submitted against the feedback.
    expect(recallBox(rc1.prompt)).toHaveValue(typed)
    expect(
      within(questionGroup(attemptQuestions()[0]))
        .getAllByRole('radio')
        .filter((radio) => (radio as HTMLInputElement).checked),
    ).toHaveLength(1)
    expect(screen.getByRole('checkbox', { name: steps.items[0].instruction })).toBeChecked()
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
