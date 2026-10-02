/**
 * One import point for the lesson-response fixtures, so a test says which lesson
 * it means by name. Every fixture goes through the same parser a real response
 * does, which is the point: a fixture that stops parsing against
 * `docs/lesson-schema.json` means the contract moved and the mirror is wrong.
 */
import { parseLessonResponse } from '../schemas/lesson-schema'

import conceptFigureImage from './concept-figure-image.json'
import conceptFigureMermaid from './concept-figure-mermaid.json'
import conceptFigureSvg from './concept-figure-svg.json'
import conceptFigureSvgHostile from './concept-figure-svg-hostile.json'
import conceptFigureWide from './concept-figure-wide.json'
import conceptMalformedBlock from './concept-malformed-block.json'
import conceptNewerSchemaVersion from './concept-newer-schema-version.json'
import conceptQuiz from './concept-quiz.json'
import conceptRecall from './concept-recall.json'
import conceptSolvingTwoStepEquations from './concept-solving-two-step-equations.json'
import conceptTableComparison from './concept-table-comparison.json'
import conceptTableRagged from './concept-table-ragged.json'
import conceptTermsAndCitations from './concept-terms-and-citations.json'
import conceptUnknownBlock from './concept-unknown-block.json'
import handsOnAnswersAndTheChecklist from './hands-on-answers-and-the-checklist.json'
import handsOnSettingUpThePracticeSet from './hands-on-setting-up-the-practice-set.json'
import reviewReviewingTwoStepEquations from './review-reviewing-two-step-equations.json'

export const conceptFixture = parseLessonResponse(conceptSolvingTwoStepEquations)

export const handsOnFixture = parseLessonResponse(handsOnSettingUpThePracticeSet)

export const reviewFixture = parseLessonResponse(reviewReviewingTwoStepEquations)

export const unknownBlockFixture = parseLessonResponse(conceptUnknownBlock)

export const malformedBlockFixture = parseLessonResponse(conceptMalformedBlock)

export const newerVersionFixture = parseLessonResponse(conceptNewerSchemaVersion)

/** Every segment type in one lesson, including the ones that must degrade. */
export const segmentsFixture = parseLessonResponse(conceptTermsAndCitations)

/**
 * A picture the lesson fetched by url, and beside it a picture whose url the
 * payload wrote as a `javascript:` one. Both are the same block type, so one
 * lesson holds them together.
 */
export const figureImageFixture = parseLessonResponse(conceptFigureImage)

/** Inline svg the backend already sanitised, rendered as a drawing. */
export const figureSvgFixture = parseLessonResponse(conceptFigureSvg)

/**
 * Inline svg carrying a script element, three event handlers, a `javascript:`
 * href, and a `data:` image. The backend sanitised this row too, and five
 * bypasses in that sanitizer's history is why the frontend sanitises again. See
 * ADR-0001.
 */
export const hostileSvgFixture = parseLessonResponse(conceptFigureSvgHostile)

/** A drawing much wider than the text column, which scrolls inside its figure. */
export const wideFigureFixture = parseLessonResponse(conceptFigureWide)

/**
 * Three diagrams in one lesson, because a diagram can go wrong in three ways and
 * the reader has to survive all of them: one that draws, one whose labels and
 * click callbacks the payload tried to smuggle in, and one mermaid cannot parse
 * at all. Drawing them is slow, so one lesson holds all three.
 */
export const figureMermaidFixture = parseLessonResponse(conceptFigureMermaid)

/**
 * A comparison wide enough that it has to scroll, which is the normal case for a
 * table in a lesson: more columns than a phone-width column of prose can hold.
 */
export const tableComparisonFixture = parseLessonResponse(conceptTableComparison)

/**
 * Three headers, and rows of two, three, and four cells. The contract says every
 * row matches the header length, so this lesson is one the backend should have
 * rejected — kept here because the reader still has to show it.
 */
export const raggedTableFixture = parseLessonResponse(conceptTableRagged)

/**
 * A quiz with three questions, and the correct option in a different place in
 * each of them: second of three, third of four, and first of three. A block that
 * gave the answer away by position, by class, or by an attribute would be caught
 * whichever question the learner looks at first.
 *
 * Every option in a question is the same number of words, which is the backend's
 * rule and the one the reader must not break by truncating or padding.
 */
export const quizFixture = parseLessonResponse(conceptQuiz)

/**
 * Two recall prompts in one lesson, with prose above, between, and below them, so
 * a test can read past a prompt and come back to it. Neither the model answer nor
 * the rubric appears anywhere in the file: the lesson response is not allowed to
 * carry them, so a fixture that did would be a fixture of a contract breach.
 */
export const recallFixture = parseLessonResponse(conceptRecall)

/**
 * All three practice block types in one lesson, which is the only shape that can
 * exercise the attempt: a quiz of three questions, a checklist of three steps, and
 * two recall prompts.
 *
 * Hands-on rather than concept on purpose. The recipe matrix in
 * `docs/lesson-format.md` forbids steps in a concept lesson, so a concept lesson
 * carrying all three would be a lesson the backend should have rejected — and a
 * fixture of a contract breach is worth avoiding unless the breach is the thing
 * being tested. A hands-on lesson is the one kind that legitimately has all three.
 *
 * Step ids, question ids, and prompt ids are the ones `attempt-result-fixtures.ts`
 * answers for, so the two fixtures are a matched pair: what was sent and what came
 * back for the same visit.
 */
export const attemptFixture = parseLessonResponse(handsOnAnswersAndTheChecklist)

/**
 * Keyed by lesson slug so a test that walks the reader by slug reads like a
 * learner following a list.
 */
export const lessonFixtures = {
  'solving-two-step-equations': conceptFixture,
  'setting-up-the-practice-set': handsOnFixture,
  'reviewing-two-step-equations': reviewFixture,
} as const
