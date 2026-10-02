import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * The data the dev mock serves, read from the fixtures the tests already use.
 *
 * Serving the real fixture files rather than a second copy is the point: a fixture
 * is a wire-shaped lesson payload — the `data` envelope where Laravel would put
 * one, numeric bigint ids, hydrated `terms` and `resources` maps — so a response
 * from this mock is byte-for-byte the shape a real backend is being asked for. The
 * app's own Zod schemas parse it on the way in, which means walking the app against
 * the mock genuinely exercises the contract assumptions rather than bypassing them.
 *
 * It also means a fixture added for a test is walkable in the browser for free, and
 * a lesson that grows new blocks starts showing them here with no change to this
 * file. Restart the dev server to pick up a fixture edit: they are cached.
 */

const fixturesDir = fileURLToPath(new URL('../src/features/lessons/fixtures/', import.meta.url))

/** The parts of a lesson header the list needs, which the fixtures all carry. */
type LessonHeader = {
  number: number
  kind: 'concept' | 'hands-on' | 'review'
  slug: string
  title: string
  minutes: number
  blocks: unknown[]
}

type LessonFixture = {
  lesson: LessonHeader
  terms: unknown
  resources: unknown
}

const cache = new Map<string, LessonFixture>()

export function readLessonFixture(name: string): LessonFixture {
  const cached = cache.get(name)

  if (cached) {
    return cached
  }

  const fixture = JSON.parse(
    readFileSync(join(fixturesDir, `${name}.json`), 'utf8'),
  ) as LessonFixture

  cache.set(name, fixture)

  return fixture
}

/**
 * One lesson the mock can serve.
 *
 * `number` is the workspace's own ordinal, so the mock owns it and overrides the
 * fixture's value when serving the detail: two fixtures happen to carry the same
 * number, and a list whose numbering contradicted the lesson it links to would be a
 * confusing thing to walk. `id` is the lesson id the path carries.
 */
type MockLesson = {
  id: number
  number: number
  fixture: string
}

const SHARED_LESSONS: MockLesson[] = [
  { id: 101, number: 1, fixture: 'concept-solving-two-step-equations' },
  { id: 102, number: 2, fixture: 'hands-on-setting-up-the-practice-set' },
  { id: 103, number: 3, fixture: 'review-reviewing-two-step-equations' },
  { id: 104, number: 4, fixture: 'concept-terms-and-citations' },
  { id: 105, number: 5, fixture: 'concept-quiz' },
  { id: 106, number: 6, fixture: 'concept-table-comparison' },
  { id: 107, number: 7, fixture: 'concept-figure-mermaid' },
  // The one that looks alarming and is not: the payload carries a script element,
  // event handlers, and a `javascript:` url, and the reader's own sanitiser is what
  // stands between it and the document. Worth walking deliberately.
  { id: 108, number: 8, fixture: 'concept-figure-svg-hostile' },
  { id: 109, number: 9, fixture: 'concept-recall' },
  { id: 110, number: 10, fixture: 'hands-on-answers-and-the-checklist' },
]

/**
 * Held back from the list until the learner asks for the next lesson, so the
 * waiting state and the polling in ticket #4 have something real to wait for.
 */
const NEXT_LESSON: MockLesson = { id: 111, number: 11, fixture: 'concept-figure-image' }

type MockWorkspace = {
  id: number
  topic: string
  /** `false` models a mission revision that has been superseded, so the
   *  next-lesson gate has something to refuse. */
  missionIsActive: boolean
  missionWhy: string
  lessons: MockLesson[]
}

const WORKSPACES: MockWorkspace[] = [
  {
    id: 1,
    topic: 'Equations: from one step to two',
    missionIsActive: true,
    missionWhy:
      'Get through the practice set before Friday. Almost every problem in it needs the two-step move.',
    lessons: SHARED_LESSONS,
  },
  {
    id: 2,
    topic: 'Equations: from two steps to three',
    // A later workspace whose mission has already been revised, so the gate is
    // closed here and the screen has to say why.
    missionIsActive: false,
    missionWhy: 'Three-step equations, once the two-step move is automatic.',
    lessons: SHARED_LESSONS.slice(0, 2),
  },
]

/**
 * Which lessons a workspace has *now*, including any that finished generating since
 * the server started. Held in memory: restarting the dev server puts a workspace
 * back to where it was, which is the least surprising behaviour for scaffolding.
 */
type GenerationState = {
  /** Set the moment a request is accepted, so a second press cannot queue a second one. */
  queued: boolean
  /** Set when the lesson actually lands in the list. */
  ready: boolean
}

const generationByWorkspace = new Map<string, GenerationState>()

function generationFor(workspaceId: string): GenerationState {
  const existing = generationByWorkspace.get(workspaceId)

  if (existing) {
    return existing
  }

  const created: GenerationState = { queued: false, ready: false }
  generationByWorkspace.set(workspaceId, created)

  return created
}

export function findWorkspace(workspaceId: string): MockWorkspace | undefined {
  return WORKSPACES.find((workspace) => String(workspace.id) === workspaceId)
}

export function listWorkspaces() {
  return WORKSPACES.map(({ id, topic }) => ({ id, topic }))
}

export function findMission(workspaceId: string) {
  const workspace = findWorkspace(workspaceId)

  if (!workspace) {
    return undefined
  }

  return {
    id: workspace.id * 10,
    why: workspace.missionWhy,
    is_active: workspace.missionIsActive,
  }
}

function lessonsForWorkspace(workspaceId: string): MockLesson[] {
  const workspace = findWorkspace(workspaceId)

  if (!workspace) {
    return []
  }

  const generation = generationByWorkspace.get(workspaceId)

  if (!generation?.ready) {
    return workspace.lessons
  }

  return [...workspace.lessons, NEXT_LESSON]
}

function toListEntry(lesson: MockLesson) {
  const { lesson: header } = readLessonFixture(lesson.fixture)

  return {
    id: lesson.id,
    number: lesson.number,
    kind: header.kind,
    title: header.title,
    minutes: header.minutes,
    // In no schema of ours. It stands in for whatever the backend adds to a list
    // row later, which the list schema is required to tolerate.
    generated_at: '2026-10-01T09:00:00Z',
  }
}

export function listLessons(workspaceId: string) {
  return {
    data: lessonsForWorkspace(workspaceId).map(toListEntry),
  }
}

export function findLesson(lessonId: string) {
  const everyLesson = [...SHARED_LESSONS, NEXT_LESSON]
  const lesson = everyLesson.find((candidate) => String(candidate.id) === lessonId)

  if (!lesson) {
    return undefined
  }

  const fixture = readLessonFixture(lesson.fixture)

  // The number is the mock's, not the fixture's, so the list and the lesson it
  // links to cannot disagree about it.
  return {
    ...fixture,
    lesson: { ...fixture.lesson, number: lesson.number },
  }
}

type QuizQuestion = {
  id: string
  options: { id: string; feedback: string }[]
  correctOptionId: string
  explanation: string
}

type PracticeBlock =
  | { type: 'quiz'; questions: QuizQuestion[] }
  | { type: 'recall'; id: string }
  | { type: 'steps'; items: { id: string }[] }

type SentAnswer =
  | { type: 'quiz'; questionId: string; optionId: string }
  | { type: 'recall'; recallId: string; text: string }
  | { type: 'steps'; stepId: string; done: boolean }

type PerAnswer = { type: 'quiz' | 'recall'; id: string; correct: boolean; feedback: string }

export type AttemptOutcome =
  | { ok: true; result: { perAnswer: PerAnswer[]; recordCandidate: null; glossaryCandidates: [] } }
  | { ok: false; status: 404 | 422; message: string }

/**
 * Grades one attempt the way the contract describes, as far as a mock can.
 *
 * Quiz answers are graded for real: the fixture ships `correctOptionId`, the chosen
 * option's feedback and the question's explanation, which is everything a backend
 * would use. Recall answers cannot be: the fixtures are lesson *responses*, so their
 * `modelAnswer` and `rubric` were stripped before the file was written. Rather than
 * invent a verdict, a written recall comes back as received and says the mock did
 * not grade it, and an empty one is marked wrong, which is what any grader would do.
 *
 * Skipped answers get no entry and steps never get one, per `perAnswer` in
 * `docs/lesson-schema.json`. An id the lesson does not have is a 422, the same
 * refusal the backend spec asks for.
 */
export function gradeAttempt(lessonId: string, rawBody: string): AttemptOutcome {
  const lesson = findLesson(lessonId)

  if (!lesson) {
    return { ok: false, status: 404, message: `The mock API has no lesson ${lessonId}.` }
  }

  let answers: SentAnswer[]

  try {
    const parsed = JSON.parse(rawBody) as { answers?: unknown }

    if (!Array.isArray(parsed.answers)) {
      throw new Error('no answers array')
    }

    answers = parsed.answers as SentAnswer[]
  } catch {
    return { ok: false, status: 422, message: 'The attempt body needs an `answers` array.' }
  }

  const blocks = lesson.lesson.blocks as PracticeBlock[]
  const questions = new Map<string, QuizQuestion>()
  const recallIds = new Set<string>()
  const stepIds = new Set<string>()

  for (const block of blocks) {
    if (block.type === 'quiz') {
      block.questions.forEach((question) => questions.set(question.id, question))
    } else if (block.type === 'recall') {
      recallIds.add(block.id)
    } else if (block.type === 'steps') {
      block.items.forEach((item) => stepIds.add(item.id))
    }
  }

  const perAnswer: PerAnswer[] = []

  for (const answer of answers) {
    if (answer.type === 'quiz') {
      const question = questions.get(answer.questionId)
      const option = question?.options.find((candidate) => candidate.id === answer.optionId)

      if (!question || !option) {
        return unknownAnswer(`quiz ${answer.questionId}/${answer.optionId}`)
      }

      perAnswer.push({
        type: 'quiz',
        id: question.id,
        correct: option.id === question.correctOptionId,
        feedback: `${option.feedback} ${question.explanation}`,
      })
    } else if (answer.type === 'recall') {
      if (!recallIds.has(answer.recallId)) {
        return unknownAnswer(`recall ${answer.recallId}`)
      }

      const written = answer.text.trim() !== ''

      perAnswer.push({
        type: 'recall',
        id: answer.recallId,
        correct: written,
        feedback: written
          ? 'Received. The mock API does not grade recall answers: the expected answer and rubric were stripped from this fixture, so a real backend writes them here instead.'
          : 'No answer was written.',
      })
    } else if (answer.type === 'steps') {
      if (!stepIds.has(answer.stepId)) {
        return unknownAnswer(`step ${answer.stepId}`)
      }
    } else {
      return { ok: false, status: 422, message: 'An answer has an unknown `type`.' }
    }
  }

  return { ok: true, result: { perAnswer, recordCandidate: null, glossaryCandidates: [] } }
}

function unknownAnswer(what: string): AttemptOutcome {
  return { ok: false, status: 422, message: `This lesson has no ${what}.` }
}

/**
 * Accepts a generation request and reports it as queued.
 *
 * The real endpoint answers `202` with nothing the frontend parses, and there is no
 * job id to hold and no job status to poll — the screen watches the list. So the
 * mock does the only honest equivalent: it makes the new lesson appear in the list
 * a few seconds later, which is precisely what a real queue finishing looks like
 * from the browser.
 */
export function queueNextLesson(workspaceId: string, delayMs: number): void {
  const generation = generationFor(workspaceId)

  // Tested against `queued` rather than `ready`: a learner who presses the button
  // twice in seven seconds should queue one lesson, not two timers racing to add it.
  if (generation.queued) {
    return
  }

  generation.queued = true

  setTimeout(() => {
    generation.ready = true
    console.log(`[mock-api] the next lesson for workspace ${workspaceId} has been written`)
  }, delayMs).unref()
}
