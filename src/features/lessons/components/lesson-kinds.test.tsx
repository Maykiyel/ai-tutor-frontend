import userEvent from '@testing-library/user-event'
import type { UserEvent } from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Route, Routes } from 'react-router'

import { paths } from '@/config/paths'
import { renderWithRouter, screen, within } from '@/test/test-utils'

import { getLesson, submitAttempt } from '../api/lesson-api'
import {
  handsOnAttemptResultResponse,
  reviewAttemptResultResponse,
} from '../fixtures/attempt-result-fixtures'
import { conceptFixture, handsOnFixture, reviewFixture } from '../fixtures/lesson-fixtures'
import { parseAttemptResult } from '../schemas/attempt-schema'
import type { ParsedLessonResponse } from '../schemas/lesson-schema'
import { LessonReader } from './lesson-reader'

// The seam: the feature's own API module, stubbed with a fixture response.
// Everything above it — router, params, query layer, screen — is the real thing.
vi.mock('../api/lesson-api')

const WORKSPACE_ID = '7'
const LESSON_ID = '12'

/**
 * One test file for the two kinds that are made of practice rather than prose.
 *
 * A hands-on lesson and a review lesson both have to arrive at a real attempt
 * result, and neither needs a component that does not already exist: the block set
 * composes. So every claim here is made at the screen seam — the reader rendered
 * from a fixture, driven by a learner typing and clicking, and read back off the
 * payload the stubbed API function received.
 */

type QuizQuestionPayload = {
  id: string
  prompt: string
  options: { id: string; text: string; feedback: string }[]
  correctOptionId: string
  explanation: string
}

type StepsPayload = {
  title: string
  items: { id: string; instruction: string; check: string }[]
}

type RecallPayload = { id: string; prompt: string }

/**
 * Every expectation about what the lesson *said* is read off its fixture rather
 * than typed out again, so a payload assertion compares the render against the
 * lesson that was stored instead of restating the renderer's own choices.
 */
function blocksOfType<T>(fixture: ParsedLessonResponse, type: string, name: string): T[] {
  const found = fixture.lesson.blocks.filter(
    (candidate) => (candidate as { type?: string }).type === type,
  ) as T[]

  if (found.length === 0) {
    throw new Error(`${name} carries no ${type} block`)
  }

  return found
}

function handsOnSteps(): StepsPayload {
  return blocksOfType<StepsPayload>(handsOnFixture, 'steps', 'the hands-on fixture')[0]
}

function handsOnRecalls(): RecallPayload[] {
  return blocksOfType<RecallPayload>(handsOnFixture, 'recall', 'the hands-on fixture')
}

function reviewQuestions(): QuizQuestionPayload[] {
  const [block] = blocksOfType<{ questions: QuizQuestionPayload[] }>(
    reviewFixture,
    'quiz',
    'the review fixture',
  )

  return block.questions
}

function reviewRecalls(): RecallPayload[] {
  return blocksOfType<RecallPayload>(reviewFixture, 'recall', 'the review fixture')
}

function renderReader(lessonId = LESSON_ID) {
  return renderWithRouter(
    <Routes>
      <Route path={paths.workspaces.lessonDetail.path} element={<LessonReader />} />
    </Routes>,
    [paths.workspaces.lessonDetail.getHref(WORKSPACE_ID, lessonId)],
  )
}

/** The same screen, opened on whichever lesson the caller means. */
function renderReaderWith(fixture: ParsedLessonResponse) {
  vi.mocked(getLesson).mockResolvedValue(fixture)

  return renderReader()
}

/** The submit action at the foot of the lesson, named by its own words. */
function sendButton(): HTMLElement {
  return screen.getByRole('button', { name: 'Send my answers' })
}

function recallBox(prompt: string): HTMLElement {
  return screen.getByRole('textbox', { name: prompt })
}

function questionGroup(question: QuizQuestionPayload): HTMLElement {
  return screen.getByRole('radiogroup', { name: question.prompt })
}

/**
 * Answers one question with the option the lesson says is right and another with
 * one it says is wrong, so a submit assertion covers both verdicts without the test
 * restating which option is which. The learner clicks options by their own text.
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

/**
 * The attempt the reader sent, as the stubbed API function received it. Read off
 * the stub rather than off the mutation cache: the payload is the contract.
 */
function sentAttempts(): { answers: Record<string, unknown>[] }[] {
  return vi.mocked(submitAttempt).mock.calls.map(([, attempt]) => attempt as never)
}

function firstSentAttempt(): { answers: Record<string, unknown>[] } {
  const attempt = sentAttempts()[0]

  if (!attempt) {
    throw new Error('the learner never submitted an attempt')
  }

  return attempt
}

/** Answers of one variant, in the order they were sent. */
function answersOfType(type: string): Record<string, unknown>[] {
  return firstSentAttempt().answers.filter((answer) => (answer as { type?: string }).type === type)
}

/** The whole attempt result, found the way a learner finds it: by its heading. */
async function resultRegion(): Promise<HTMLElement> {
  const heading = await screen.findByRole('heading', { level: 2, name: 'How your answers went' })

  return heading.closest('section')!
}

/**
 * Prose standing on its own in the column of the lesson.
 *
 * A `paragraph` is the only block that renders a run of explanation with nothing
 * around it. Every other run of prose on a lesson page belongs to something else:
 * a callout's words are inside a note, a question's prompt is what names its own
 * radio group, and a recall's status line sits in the same group as the box it is
 * talking about. So what is left after those are accounted for is exactly the
 * paragraphs — which is why this is worth asserting on a kind whose recipe forbids
 * them, and why the companion test proves it can still find one.
 *
 * The reader's own furniture is not measured: the header, the sources and the
 * submit panel are the app's words about the lesson rather than the lesson's, and a
 * review lesson still has all three whatever the backend wrote in it.
 */
function freeProse(container: HTMLElement): string[] {
  const furniture = [
    container.querySelector('header'),
    container.querySelector('[aria-labelledby="lesson-sources-heading"]'),
    // The submit panel, before it is sent and after: one section either way.
    screen.queryByRole('button', { name: 'Send my answers' })?.closest('section') ??
      screen
        .queryByRole('heading', { level: 2, name: 'How your answers went' })
        ?.closest('section'),
  ].filter(Boolean) as Element[]

  return Array.from(container.querySelectorAll('p'))
    .filter((paragraph) => !furniture.some((region) => region.contains(paragraph)))
    .filter((paragraph) => {
      if (paragraph.closest('[role="note"]')) {
        return false
      }

      const id = paragraph.getAttribute('id')

      if (id && container.querySelector(`[aria-labelledby="${id}"]`)) {
        return false
      }

      return !paragraph.parentElement?.querySelector('textarea')
    })
    .map((paragraph) => paragraph.textContent ?? '')
    .filter(Boolean)
}

describe('the kind of lesson', () => {
  beforeEach(() => {
    vi.mocked(getLesson).mockReset()
    vi.mocked(submitAttempt).mockReset()
  })

  it.each([
    [
      'a concept lesson',
      conceptFixture,
      'Solving two-step equations',
      'Lesson 3 · Concept',
      'New material. Read it, then check yourself at the end.',
    ],
    [
      'a hands-on lesson',
      handsOnFixture,
      'Setting up the practice set',
      'Lesson 4 · Hands-on',
      'Practice. Work down the checklist with your own work open.',
    ],
    [
      'a review lesson',
      reviewFixture,
      'Reviewing two-step equations',
      'Lesson 5 · Review',
      'Practice from memory. Nothing new is introduced here.',
    ],
  ])(
    'tells the learner in words whether %s is reading or practising',
    async (_name, fixture, title, label, purpose) => {
      vi.mocked(getLesson).mockResolvedValue(fixture)

      renderReader()

      expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument()

      // The kind is named outright, and what the kind means for the next fifteen
      // minutes is said as well. The label alone answers "what is this lesson
      // called"; the sentence answers "am I about to be taught something, or asked
      // to practise", which is the question the learner actually has.
      //
      // Both are words. Which kind of lesson this is is not carried by a colour, a
      // badge shape or an icon, so a learner who perceives none of the palette can
      // still tell reading from practising — and so can a screen reader.
      expect(screen.getByText(label)).toBeInTheDocument()
      expect(screen.getByText(purpose)).toBeInTheDocument()
    },
  )

  it('gives the three kinds three different sentences, so the sentence is carrying the distinction', async () => {
    // The line above would pass just as well if every kind said the same thing. It
    // does not, and a learner who saw three lessons could tell which was which from
    // the header alone.
    const purposes = []

    for (const [fixture, title] of [
      [conceptFixture, 'Solving two-step equations'],
      [handsOnFixture, 'Setting up the practice set'],
      [reviewFixture, 'Reviewing two-step equations'],
    ] as const) {
      const { unmount } = renderReaderWith(fixture)

      await screen.findByRole('heading', { level: 1, name: title })

      // The sentence under the title, which is the only one on the page that opens
      // by naming what sort of visit this is.
      purposes.push(screen.getByText(/^(New material|Practice)\b/).textContent)

      unmount()
    }

    expect(new Set(purposes).size).toBe(3)
    // The concept lesson is the one that says there is something new to read; the
    // other two both say practice, which is what makes them the same kind of visit.
    expect(purposes.filter((purpose) => purpose?.startsWith('New material'))).toHaveLength(1)
    expect(purposes.filter((purpose) => purpose?.startsWith('Practice'))).toHaveLength(2)
  })
})

describe('a hands-on lesson', () => {
  beforeEach(() => {
    vi.mocked(getLesson).mockReset()
    vi.mocked(submitAttempt).mockReset()
    vi.mocked(submitAttempt).mockResolvedValue(parseAttemptResult(handsOnAttemptResultResponse))
  })

  it('reads as a checklist with a prompt, which is the whole recipe for this kind', async () => {
    vi.mocked(getLesson).mockResolvedValue(handsOnFixture)

    renderReader()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Setting up the practice set' }),
    ).toBeInTheDocument()

    // Steps and recall, both on the page as the learner arrives, and both of them
    // the learner can act on: a tickable box per step, a box to write in per prompt.
    const { items } = handsOnSteps()
    expect(screen.getAllByRole('checkbox')).toHaveLength(items.length)
    expect(screen.getAllByRole('textbox')).toHaveLength(handsOnRecalls().length)

    // The checklist is named by its own title, so a screen reader says which list a
    // step belongs to, and the prompt is the name of the box it belongs to.
    expect(screen.getByRole('group', { name: handsOnSteps().title })).toBeInTheDocument()
    for (const prompt of handsOnRecalls()) {
      expect(recallBox(prompt.prompt)).toHaveValue('')
    }
  })

  it('takes the whole visit in one attempt: the ticks, the prompt answer, and the result that comes back', async () => {
    const learner = userEvent.setup()
    vi.mocked(getLesson).mockResolvedValue(handsOnFixture)

    renderReader()

    await screen.findByRole('heading', { level: 1, name: 'Setting up the practice set' })

    const steps = handsOnSteps()
    const [recall] = handsOnRecalls()
    const typed = 'It has no symbols to get wrong.'

    await learner.click(screen.getByRole('checkbox', { name: steps.items[0].instruction }))
    await learner.click(screen.getByRole('checkbox', { name: steps.items[2].instruction }))
    await learner.type(recallBox(recall.prompt), typed)

    await learner.click(sendButton())

    const region = await resultRegion()

    // One request for the whole visit, carrying every step the lesson has and the
    // one answer the learner gave.
    expect(vi.mocked(submitAttempt)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(submitAttempt).mock.calls[0][0]).toBe(LESSON_ID)

    expect(answersOfType('recall')).toEqual([{ type: 'recall', recallId: recall.id, text: typed }])

    // Telemetry for every step in the lesson, in the lesson's order, whether or not
    // it was touched: s2 and s4 were never opened, which is not the same as a step
    // that was ticked and unticked, and the contract carries the difference.
    expect(answersOfType('steps')).toEqual([
      { type: 'steps', stepId: steps.items[0].id, done: true },
      { type: 'steps', stepId: steps.items[1].id, done: false },
      { type: 'steps', stepId: steps.items[2].id, done: true },
      { type: 'steps', stepId: steps.items[3].id, done: false },
    ])

    // This lesson has no quiz, so nothing was sent shaped like one.
    expect(answersOfType('quiz')).toEqual([])

    // The result is the learner's: their own sentence, the expected answer, and the
    // rubric to compare it against, which the lesson response did not carry.
    expect(region).toHaveTextContent(typed)
    expect(region).toHaveTextContent('A sentence has no symbols to get wrong')
    expect(region).toHaveTextContent('Names the sentence as plain words')

    // One graded answer came back and it was right, and the checklist that went with
    // it is named as not being part of the count.
    expect(region).toHaveTextContent('1 of 1 answer right.')
    expect(region).toHaveTextContent(
      'Your checklist is not in this count. Steps are not graded, so they contribute nothing to it.',
    )
  })

  it('locks the checklist and the prompt once the attempt is in, and keeps the ticks where they were', async () => {
    const learner = userEvent.setup()
    vi.mocked(getLesson).mockResolvedValue(handsOnFixture)

    renderReader()

    await screen.findByRole('heading', { level: 1, name: 'Setting up the practice set' })

    const steps = handsOnSteps()
    const [recall] = handsOnRecalls()
    const typed = 'It has no symbols to get wrong.'

    await learner.click(screen.getByRole('checkbox', { name: steps.items[0].instruction }))
    await learner.type(recallBox(recall.prompt), typed)
    await learner.click(sendButton())

    await resultRegion()

    // The ticks stay readable against the result, so the learner can see how far
    // they got rather than being left with an emptied checklist.
    const ticked = screen.getByRole('checkbox', {
      name: steps.items[0].instruction,
    }) as HTMLInputElement
    expect(ticked).toBeChecked()
    expect(
      (screen.getByRole('checkbox', { name: steps.items[1].instruction }) as HTMLInputElement)
        .checked,
    ).toBe(false)
    expect(recallBox(recall.prompt)).toHaveValue(typed)

    // Every control that took an answer refuses a new one, and says so in words.
    expect(screen.getAllByRole('checkbox').every((box) => (box as HTMLInputElement).disabled)).toBe(
      true,
    )
    expect(recallBox(recall.prompt)).toHaveAttribute('readonly')
    expect(screen.queryByRole('button', { name: 'Send my answers' })).not.toBeInTheDocument()
  })

  it('keeps a wide figure and a long code sample inside their own scroll areas, so neither widens the lesson', async () => {
    vi.mocked(getLesson).mockResolvedValue(handsOnFixture)

    const { container } = renderReader()

    await screen.findByRole('heading', { level: 1, name: 'Setting up the practice set' })

    // The awkward pair, in one lesson: a drawing wider than the column of prose and
    // a code sample with lines longer than it. Both are allowed to be wider than the
    // reading measure; neither is allowed to widen the reading measure.
    const figure = screen.getByRole('img', {
      name: 'Four problem cards laid out side by side, one card per problem on the sheet.',
    })
    const code = screen.getByText(/def set_up\(total: float, each: float\)/)

    expect(figure.closest('[data-scrollbars="x"]')).toBeInTheDocument()
    expect(code.closest('[data-scrollbars="x"]')).toBeInTheDocument()

    // Each has a viewport of its own rather than sharing one, so a wide drawing
    // cannot drag the code with it and a long line cannot clip the drawing.
    expect(figure.closest('[data-scrollbars="x"]')).not.toBe(code.closest('[data-scrollbars="x"]'))

    // The caption names what the learner would otherwise have to guess, and the code
    // is still inert text: the long lines are words, not markup. See ADR-0001.
    expect(screen.getByText(/The sheet is wider than the column\./)).toBeInTheDocument()
    expect(code.tagName).toBe('PRE')
    expect(code.children).toHaveLength(0)

    // And the lesson around them is intact: the checklist still renders below the
    // wide parts rather than being pushed off the page with them.
    const group = screen.getByRole('group', { name: handsOnSteps().title })
    expect(within(group).getAllByRole('checkbox')).toHaveLength(handsOnSteps().items.length)
    expect(container.querySelectorAll('[data-scrollbars="x"]').length).toBeGreaterThanOrEqual(2)
  })

  it('takes the whole visit from the keyboard alone: tick a step, write a prompt, send', async () => {
    const learner = userEvent.setup()
    vi.mocked(getLesson).mockResolvedValue(handsOnFixture)

    renderReader()

    await screen.findByRole('heading', { level: 1, name: 'Setting up the practice set' })

    const [first] = handsOnSteps().items
    const [recall] = handsOnRecalls()
    const typed = 'It has no symbols to get wrong.'

    // Both answers reached by tabbing, not by reaching for the element: a
    // hands-on lesson is a worksheet, and a worksheet a learner cannot fill in
    // without a mouse is a worksheet half of them cannot do. Tabbed to rather than
    // focused directly, so this proves they are reachable by keyboard at all.
    for (const control of [
      screen.getByRole('checkbox', { name: first.instruction }),
      recallBox(recall.prompt),
    ]) {
      for (let presses = 0; presses < 40 && document.activeElement !== control; presses += 1) {
        await learner.tab()
      }

      expect(control).toHaveFocus()
    }

    // The prompt takes typed prose.
    await learner.keyboard(typed)
    expect(recallBox(recall.prompt)).toHaveValue(typed)

    // Space ticks the step, and Done is a word as well as a tick, so a learner who
    // perceives neither still knows where they are in the list.
    const box = screen.getByRole('checkbox', { name: first.instruction })
    box.focus()
    await learner.keyboard(' ')

    expect(box).toBeChecked()
    expect(box.closest('label')!.textContent).toContain('Done')

    // And the one submit action is operable by keyboard too.
    sendButton().focus()
    await learner.keyboard('{Enter}')

    const region = await resultRegion()

    expect(region).toHaveTextContent(typed)
    expect(answersOfType('steps')).toEqual([
      { type: 'steps', stepId: first.id, done: true },
      { type: 'steps', stepId: handsOnSteps().items[1].id, done: false },
      { type: 'steps', stepId: handsOnSteps().items[2].id, done: false },
      { type: 'steps', stepId: handsOnSteps().items[3].id, done: false },
    ])
  })
})

describe('a review lesson', () => {
  beforeEach(() => {
    vi.mocked(getLesson).mockReset()
    vi.mocked(submitAttempt).mockReset()
    vi.mocked(submitAttempt).mockResolvedValue(parseAttemptResult(reviewAttemptResultResponse))
  })

  it('reads as questions and prompts, which is the whole recipe for this kind', async () => {
    vi.mocked(getLesson).mockResolvedValue(reviewFixture)

    renderReader()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Reviewing two-step equations' }),
    ).toBeInTheDocument()

    // A quiz and several recall prompts, all of them answerable, and nothing else
    // for the learner to do.
    for (const question of reviewQuestions()) {
      expect(within(questionGroup(question)).getAllByRole('radio')).toHaveLength(
        question.options.length,
      )
    }

    const prompts = reviewRecalls()
    expect(screen.getAllByRole('textbox')).toHaveLength(prompts.length)
    for (const prompt of prompts) {
      expect(recallBox(prompt.prompt)).toHaveValue('')
    }
  })

  it('has no explanation blocks: no checklist, no code, no figure, and no paragraph of prose', async () => {
    const learner = userEvent.setup()
    vi.mocked(getLesson).mockResolvedValue(reviewFixture)

    const { container } = renderReader()

    await screen.findByRole('heading', { level: 1, name: 'Reviewing two-step equations' })

    // A review introduces no new explanation, so the blocks the recipe forbids for
    // this kind leave nothing on the page. Each is checked by what it would have
    // rendered as, not by the payload's own list of types.
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(container.querySelector('pre')).toBeNull()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()

    // And no body prose either. A paragraph is the one block that renders a run of
    // explanation standing on its own in the column: a callout puts its words in a
    // note, a question is the name of its own radio group, and a recall's status
    // line sits beside the box it is talking about. So anything left over after
    // those is a paragraph, and a review lesson has none.
    expect(freeProse(container)).toEqual([])

    // And the learner can prove the page still works: answering is possible, and the
    // review asks for nothing else.
    await pickOption(learner, reviewQuestions()[0], true)
    expect(sendButton()).toBeEnabled()
  })

  it('finds the paragraphs of a lesson that is allowed to have them, so the check above has teeth', async () => {
    // The other half of the claim above, because "no paragraphs" is only worth
    // anything if the way it is measured can find one. A concept lesson is exactly
    // the lesson the review is measured against, and it teaches.
    vi.mocked(getLesson).mockResolvedValue(conceptFixture)

    const { container } = renderReader()

    await screen.findByRole('heading', { level: 1, name: 'Solving two-step equations' })

    const prose = freeProse(container)

    expect(prose.length).toBeGreaterThan(0)
    expect(prose.join(' ')).toContain('An equation is a claim that two things are equal.')
  })

  it('sends every prompt the learner answered and every question they picked, and grades each one back', async () => {
    const learner = userEvent.setup()
    vi.mocked(getLesson).mockResolvedValue(reviewFixture)

    renderReader()

    await screen.findByRole('heading', { level: 1, name: 'Reviewing two-step equations' })

    const questions = reviewQuestions()
    const prompts = reviewRecalls()

    // Short and all different, which is all these assertions need: one answer must
    // never be mistaken for another's. Every word here is typed one character at a
    // time, so a sentence here costs a second of the suite's budget.
    const answers = [
      'The 3 sits on the left side.',
      'Every step has an inverse.',
      'Check both sides.',
    ]

    await pickOption(learner, questions[0], true)
    await pickOption(learner, questions[1], false)
    for (const [index, prompt] of prompts.entries()) {
      await learner.type(recallBox(prompt.prompt), answers[index])
    }

    await learner.click(sendButton())

    // Waited on rather than dropped: the payload assertions below read the request
    // the learner sent, and that request is only sent once the button is pressed.
    await resultRegion()

    expect(vi.mocked(submitAttempt)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(submitAttempt).mock.calls[0][0]).toBe(LESSON_ID)

    expect(answersOfType('quiz')).toEqual([
      { type: 'quiz', questionId: questions[0].id, optionId: questions[0].correctOptionId },
      expect.objectContaining({ questionId: questions[1].id }),
    ])
    expect(answersOfType('quiz')[1].optionId).not.toBe(questions[1].correctOptionId)

    // Every prompt, in the lesson's order, with what the learner actually wrote.
    expect(answersOfType('recall')).toEqual(
      prompts.map((prompt, index) => ({
        type: 'recall',
        recallId: prompt.id,
        text: answers[index],
      })),
    )

    // A review has no checklist, so no step telemetry was invented for it.
    expect(answersOfType('steps')).toEqual([])
  })

  it('returns per-answer feedback for every recall the learner answered, each against its own prompt', async () => {
    const learner = userEvent.setup()
    vi.mocked(getLesson).mockResolvedValue(reviewFixture)

    renderReader()

    await screen.findByRole('heading', { level: 1, name: 'Reviewing two-step equations' })

    const prompts = reviewRecalls()

    // Three prompts, three sentences, deliberately different from each other so a
    // result that showed one answer's feedback three times would be visible.
    // Short and all different, so a result that showed one answer's feedback three
    // times would be visible.
    const answers = [
      'The 3 sits on the left side.',
      'Every step has an inverse.',
      'Check both sides.',
    ]

    // The quiz is answered too, so the result that comes back has an entry per
    // graded answer in the lesson and the three recall notes below are three of
    // five rather than all of them.
    await pickOption(learner, reviewQuestions()[0], true)
    await pickOption(learner, reviewQuestions()[1], false)

    for (const [index, prompt] of prompts.entries()) {
      await learner.type(recallBox(prompt.prompt), answers[index])
    }

    await learner.click(sendButton())

    const region = await resultRegion()

    // Five graded answers came back, so five notes. Two of the five are the quiz,
    // which leaves three — one per recall prompt, not one per lesson. A review is
    // where a learner looks to find the gaps, so a single note covering three
    // prompts would be the one thing it must not do.
    expect(within(region).getAllByRole('note')).toHaveLength(5)

    const notes = within(region)
      .getAllByRole('note')
      .filter((note) => prompts.some((prompt) => note.textContent?.includes(prompt.prompt)))
    expect(notes).toHaveLength(prompts.length)

    for (const [index, prompt] of prompts.entries()) {
      const note = notes.find((candidate) => candidate.textContent?.includes(prompt.prompt))!

      expect(note).toBeDefined()
      expect(note).toHaveTextContent(answers[index])
    }

    // Each note carries the backend's own words for that prompt, and they are
    // different words: the expected answer for the first prompt is not the feedback
    // for the third.
    expect(region).toHaveTextContent(
      'the 3 is added to the whole of 2x, so it has to come off before the 2 stops multiplying',
    )
    expect(region).toHaveTextContent('Every step you can undo has an inverse')
    expect(region).toHaveTextContent('Put the answer back into both sides')

    // Both wrong verdicts are said in words and a glyph rather than in a colour
    // alone: one of them is the quiz question, the other the second recall.
    const wrong = within(region).getAllByRole('note', { name: 'Not quite' })
    expect(wrong).toHaveLength(2)
    expect(wrong.every((note) => note.textContent?.includes('✗'))).toBe(true)

    // Each recall's rubric arrived with it, labelled as what it is.
    expect(region).toHaveTextContent('Says the 3 is added to the whole left side')
    expect(region).toHaveTextContent('Says the 2 multiplies whatever is left')

    // Five graded answers in the lesson, five results, none skipped.
    expect(region).toHaveTextContent('3 of 5 answers right.')
  })

  it('omits a prompt the learner never reached, and says it was skipped rather than counting it wrong', async () => {
    const learner = userEvent.setup()
    vi.mocked(getLesson).mockResolvedValue(reviewFixture)

    renderReader()

    await screen.findByRole('heading', { level: 1, name: 'Reviewing two-step equations' })

    const prompts = reviewRecalls()
    const [first, untouched, third] = prompts
    const questions = reviewQuestions()

    // The middle prompt is never opened. Everything else in the lesson is answered,
    // so the skipped count below isolates that one prompt rather than counting every
    // answer the learner chose not to give.
    vi.mocked(submitAttempt).mockResolvedValue(
      parseAttemptResult({
        perAnswer: [
          {
            type: 'quiz',
            id: questions[0].id,
            correct: true,
            feedback: 'Exactly that. Take the 3 off first.',
          },
          {
            type: 'quiz',
            id: questions[1].id,
            correct: false,
            feedback: 'Check that every step was reversible.',
          },
          {
            type: 'recall',
            id: first.id,
            correct: true,
            feedback: 'A good answer says: The 3 is added to the whole of 2x.',
          },
          {
            type: 'recall',
            id: third.id,
            correct: false,
            feedback: 'A good answer says: Put the answer back into both sides.',
          },
        ],
        recordCandidate: null,
        glossaryCandidates: [],
      }),
    )

    await pickOption(learner, questions[0], true)
    await pickOption(learner, questions[1], true)
    await learner.type(recallBox(first.prompt), 'The 3 sits on the left side.')
    await learner.type(recallBox(third.prompt), 'Check both sides.')

    await learner.click(sendButton())

    const region = await resultRegion()

    // Omitted rather than sent blank: a skipped answer means skipped in the contract,
    // and it is excluded from grading. Only the untouched prompt is absent, and the
    // two the learner wrote are both here in the order the lesson wrote them.
    expect(answersOfType('recall').map((answer) => answer.recallId)).toEqual([first.id, third.id])

    // The summary says what was skipped rather than pretending it was wrong or
    // pretending the lesson never asked it. Two of the four answers that came back
    // were right, and one graded answer was skipped.
    expect(region).toHaveTextContent('2 of 4 answers right.')
    expect(region).toHaveTextContent('1 answer was skipped, and a skipped answer is not graded.')

    // And the prompt is still on the page, unanswered, rather than gone.
    expect(recallBox(untouched.prompt)).toHaveValue('')
  })
})
