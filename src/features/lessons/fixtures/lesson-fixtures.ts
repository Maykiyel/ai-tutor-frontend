/**
 * One import point for the lesson-response fixtures, so a test says which lesson
 * it means by name. Every fixture goes through the same parser a real response
 * does, which is the point: a fixture that stops parsing against
 * `docs/lesson-schema.json` means the contract moved and the mirror is wrong.
 */
import { parseLessonResponse } from '../schemas/lesson-schema'

import conceptMalformedBlock from './concept-malformed-block.json'
import conceptNewerSchemaVersion from './concept-newer-schema-version.json'
import conceptSolvingTwoStepEquations from './concept-solving-two-step-equations.json'
import conceptTermsAndCitations from './concept-terms-and-citations.json'
import conceptUnknownBlock from './concept-unknown-block.json'
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
 * Keyed by lesson slug so a test that walks the reader by slug reads like a
 * learner following a list.
 */
export const lessonFixtures = {
  'solving-two-step-equations': conceptFixture,
  'setting-up-the-practice-set': handsOnFixture,
  'reviewing-two-step-equations': reviewFixture,
} as const
