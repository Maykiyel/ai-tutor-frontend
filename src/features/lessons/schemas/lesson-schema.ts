import { z } from 'zod'

/**
 * A Zod mirror of `docs/lesson-schema.json`. The schema file is authoritative;
 * this one only translates it, so a contract change shows up here as a parse
 * failure rather than as a mystery in the renderer.
 *
 * Two deliberate departures from a literal translation, both because the reader
 * must survive a lesson it does not fully understand:
 *
 * - **The lesson header parses strictly.** Every field the contract requires is
 *   required here, and the whole header must validate or the response is an
 *   error state with a retry. A header is not something to render partially.
 * - **The hydrated maps parse leniently.** `terms` and `resources` are hydrated
 *   by the backend, so an id the response happens not to carry is a fact about
 *   the response, not a broken lesson. A missing map, an entry that fails to
 *   validate, or a segment pointing at an absent id all degrade to plain text.
 *
 * Blocks are parsed one at a time by `parseLessonBlocks`, never as a whole
 * array: one bad block must not cost the learner the lesson. See ADR-0002.
 *
 * On `additionalProperties: false`: the contract sets it, and no Zod object here
 * calls `.strict()` to match it, so an unrecognised field on a block is dropped
 * rather than failing that block. That is the same tolerance the workspace schema
 * documents and for the same reason — a field the backend adds later must not cost
 * a learner a stored lesson, and the contract change that describes it is a commit
 * to the schema file anyway. Every field the contract *does* require is required
 * here, so nothing the contract describes is ever silently ignored.
 */

export const SUPPORTED_SCHEMA_VERSION = 1

export const lessonKindSchema = z.enum(['concept', 'hands-on', 'review'])
export const calloutToneSchema = z.enum(['win', 'note', 'watch-out'])
export const headingLevelSchema = z.union([z.literal(2), z.literal(3)])

export type LessonKind = z.infer<typeof lessonKindSchema>
export type CalloutTone = z.infer<typeof calloutToneSchema>

// Segments: inline content inside a paragraph or callout. Rendered as React
// text, never injected as HTML.
const textSegmentSchema = z.object({
  type: z.literal('text'),
  text: z.string(),
})

const inlineCodeSegmentSchema = z.object({
  type: z.literal('code'),
  text: z.string(),
})

const termSegmentSchema = z.object({
  type: z.literal('term'),
  termId: z.number().int(),
  text: z.string(),
})

const citeSegmentSchema = z.object({
  type: z.literal('cite'),
  resourceId: z.number().int(),
  text: z.string(),
})

const linkSegmentSchema = z.object({
  type: z.literal('link'),
  to: z.enum(['lesson', 'reference']),
  targetId: z.number().int(),
  text: z.string(),
})

export const segmentSchema = z.discriminatedUnion('type', [
  textSegmentSchema,
  inlineCodeSegmentSchema,
  termSegmentSchema,
  citeSegmentSchema,
  linkSegmentSchema,
])

export type Segment = z.infer<typeof segmentSchema>

const segmentsSchema = z.array(segmentSchema).min(1)

// The prose blocks this ticket renders. Later tickets add their own schemas and
// their own registry entries; nothing here changes when they do.
export const paragraphBlockSchema = z.object({
  type: z.literal('paragraph'),
  content: segmentsSchema,
})

export const headingBlockSchema = z.object({
  type: z.literal('heading'),
  level: headingLevelSchema,
  text: z.string(),
})

export const calloutBlockSchema = z.object({
  type: z.literal('callout'),
  tone: calloutToneSchema,
  content: segmentsSchema,
})

export const codeBlockSchema = z.object({
  type: z.literal('code'),
  language: z.string(),
  code: z.string(),
})

/**
 * A figure is a thing rather than a sentence: inline svg, a mermaid diagram, or
 * a picture at a url. All three carry `alt`, which the contract says is real alt
 * text and never a placeholder, so the reader always has words to fall back on
 * even when the figure itself cannot be shown. Mirrors `figureBlock` in
 * `docs/lesson-schema.json`.
 */
export const figureBlockSchema = z.object({
  type: z.literal('figure'),
  kind: z.enum(['svg', 'mermaid', 'image']),
  source: z.string(),
  alt: z.string(),
  caption: z.string().optional(),
})

/**
 * Headers and rows, each cell a string. Mirrors `tableBlock` in
 * `docs/lesson-schema.json`.
 *
 * Row length is **not** enforced here, even though the contract says every row
 * matches the header length. The backend is the layer that rejects such a lesson
 * at write time; the layer that has to cope with one is the reader, and a ragged
 * row is a row the learner can still read. See ADR-0002.
 */
export const tableBlockSchema = z.object({
  type: z.literal('table'),
  headers: z.array(z.string()),
  rows: z.array(z.array(z.string())),
})

/**
 * A question, its options, and the two pieces of feedback that make the block
 * instant: each option carries its own feedback, shown the moment it is picked,
 * and the question carries the explanation that follows it. They ship in the
 * lesson because a learner who peeks only cheats themselves. Mirrors
 * `quizBlock` in `docs/lesson-schema.json`.
 *
 * `correctOptionId` is typed as a plain string, exactly as the contract types it,
 * rather than being refined against the options. A quiz question that names no
 * option is a lesson the backend should have rejected, and the reader still has
 * to show: every option stays pickable, and every option still gets the feedback
 * the lesson wrote for it, which is the part that teaches. See ADR-0002.
 *
 * `tests` is optional in the contract and is not used by the reader yet: the ids
 * point at sources and glossary terms the response hydrates, and the block has
 * nothing to say about them before an attempt is submitted.
 */
/**
 * A checklist for a hands-on lesson. Each item says what to do and how the
 * learner will know it is done; the check is a hint, never graded, which is why
 * the contract posts a `done` flag per step and no feedback for it. Mirrors
 * `stepsBlock` in `docs/lesson-schema.json`.
 */
const stepsItemSchema = z.object({
  id: z.string().regex(/^s[0-9]+$/),
  instruction: z.string(),
  check: z.string(),
})

export const stepsBlockSchema = z.object({
  type: z.literal('steps'),
  title: z.string(),
  items: z.array(stepsItemSchema).min(1),
})

const quizOptionSchema = z.object({
  id: z.string().regex(/^[a-z]$/),
  text: z.string(),
  feedback: z.string(),
})

const quizQuestionSchema = z.object({
  id: z.string().regex(/^q[0-9]+$/),
  prompt: z.string(),
  options: z.array(quizOptionSchema).min(3).max(4),
  correctOptionId: z.string(),
  explanation: z.string(),
  tests: z.array(z.number().int()).optional(),
})

export const quizBlockSchema = z.object({
  type: z.literal('quiz'),
  questions: z.array(quizQuestionSchema).min(1),
})

/**
 * A prompt the learner answers from memory. The contract stores a `modelAnswer`
 * and a `rubric` with the block and strips both from the lesson response, which
 * is why **neither field is in this schema**: a lesson response is the shape
 * below, and a response carrying either one is a contract breach the reader must
 * not act on. The two are not parsed here, so there is nothing for a component
 * to render even if a backend ever sends one. They come back in the attempt
 * result, after the learner has submitted. Mirrors `recallBlock` in
 * `docs/lesson-schema.json`.
 */
export const recallBlockSchema = z.object({
  type: z.literal('recall'),
  id: z.string().regex(/^rc[0-9]+$/),
  prompt: z.string(),
})

export type ParagraphBlock = z.infer<typeof paragraphBlockSchema>
export type HeadingBlock = z.infer<typeof headingBlockSchema>
export type CalloutBlock = z.infer<typeof calloutBlockSchema>
export type CodeBlock = z.infer<typeof codeBlockSchema>
export type FigureBlock = z.infer<typeof figureBlockSchema>
export type TableBlock = z.infer<typeof tableBlockSchema>
export type StepsBlock = z.infer<typeof stepsBlockSchema>
export type QuizBlock = z.infer<typeof quizBlockSchema>
export type RecallBlock = z.infer<typeof recallBlockSchema>

/**
 * Every block type `docs/lesson-schema.json` defines, fixed at nine. This is the
 * *contract's* set, kept separate from `LessonBlock` below so that a type the
 * app has no component for is still a known type rather than an unknown one.
 * A block carrying any other `type` is an unknown type: it renders nothing and
 * is logged.
 */
export const lessonBlockTypeSchema = z.enum([
  'callout',
  'heading',
  'paragraph',
  'code',
  'figure',
  'table',
  'steps',
  'quiz',
  'recall',
])

export type LessonBlockType = z.infer<typeof lessonBlockTypeSchema>

/**
 * The blocks this build has a schema for, which is now all nine contract types.
 * `LessonBlock` grew one arm per ticket, and a block type the app has no schema
 * for is not the same thing as a block type it does not render: the first is a
 * gap in this file, the second a gap in the registry.
 */
export type LessonBlock =
  | z.infer<typeof paragraphBlockSchema>
  | z.infer<typeof headingBlockSchema>
  | z.infer<typeof calloutBlockSchema>
  | z.infer<typeof codeBlockSchema>
  | z.infer<typeof figureBlockSchema>
  | z.infer<typeof tableBlockSchema>
  | z.infer<typeof stepsBlockSchema>
  | z.infer<typeof quizBlockSchema>
  | z.infer<typeof recallBlockSchema>

/**
 * The lesson without its blocks. `blocks` is deliberately absent: it is the one
 * field the reader must never validate all-or-nothing, so it is carried through
 * unparsed and handed to `parseLessonBlocks` one entry at a time.
 */
export const lessonHeaderSchema = z.object({
  schemaVersion: z.number().int().min(1),
  number: z.number().int().min(1),
  kind: lessonKindSchema,
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  skill: z.string().min(1),
  missionLink: z.string().min(1),
  minutes: z.number().int().min(1).max(15),
  primarySource: z.object({
    resourceId: z.number().int(),
    why: z.string().min(1),
  }),
  related: z
    .object({
      lessons: z.array(z.number().int()).optional(),
      references: z.array(z.number().int()).optional(),
    })
    .optional(),
})

export type LessonHeader = z.infer<typeof lessonHeaderSchema>

const rawLessonSchema = lessonHeaderSchema.extend({
  blocks: z.array(z.unknown()),
})

// Hydrated maps. Lenient on purpose: see the note at the top of this file.
const hydratedTermSchema = z.object({
  term: z.string(),
  definition: z.string(),
  avoid: z.array(z.string()).optional(),
})

const hydratedResourceSchema = z.object({
  title: z.string(),
  url: z.string(),
})

export type HydratedTerm = z.infer<typeof hydratedTermSchema>
export type HydratedResource = z.infer<typeof hydratedResourceSchema>

/**
 * Drops entries that fail to validate rather than failing the whole map, and
 * returns an empty map when the key is absent entirely. An id the response does
 * not carry then degrades its segment to plain text.
 */
function lenientMap<T>(entry: z.ZodType<T>): z.ZodType<Record<string, T>> {
  return z
    .unknown()
    .optional()
    .transform((raw) => {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return {} as Record<string, T>
      }

      const entries = Object.entries(raw).flatMap(([id, value]) => {
        const parsed = entry.safeParse(value)

        return parsed.success ? ([[id, parsed.data]] as [string, T][]) : []
      })

      return Object.fromEntries(entries)
    })
}

export const hydratedTermsSchema = lenientMap(hydratedTermSchema)
export const hydratedResourcesSchema = lenientMap(hydratedResourceSchema)

/**
 * The whole response envelope, parsed. The header and the hydrated maps are
 * required for a readable lesson, so a response missing any of them throws and
 * the reader shows an error state with a retry rather than a blank page. The
 * `data` wrapper is accepted as well, since Laravel API resources use it.
 */
export const lessonResponseSchema = z
  .object({
    lesson: rawLessonSchema,
    terms: hydratedTermsSchema,
    resources: hydratedResourcesSchema,
  })
  .or(
    z
      .object({
        data: z.object({
          lesson: rawLessonSchema,
          terms: hydratedTermsSchema,
          resources: hydratedResourcesSchema,
        }),
      })
      .transform((body) => body.data),
  )

/**
 * What the reader renders from: a validated header, the hydrated maps, and the
 * raw `blocks` array left unparsed for the per-block pass.
 */
export type ParsedLessonResponse = {
  lesson: Omit<LessonHeader, 'blocks'> & { blocks: unknown[] }
  terms: Record<string, HydratedTerm>
  resources: Record<string, HydratedResource>
}

export function parseLessonResponse(raw: unknown): ParsedLessonResponse {
  const parsed = lessonResponseSchema.parse(raw)

  return {
    lesson: {
      schemaVersion: parsed.lesson.schemaVersion,
      number: parsed.lesson.number,
      kind: parsed.lesson.kind,
      slug: parsed.lesson.slug,
      title: parsed.lesson.title,
      skill: parsed.lesson.skill,
      missionLink: parsed.lesson.missionLink,
      minutes: parsed.lesson.minutes,
      primarySource: parsed.lesson.primarySource,
      related: parsed.lesson.related,
      blocks: parsed.lesson.blocks,
    },
    terms: parsed.terms,
    resources: parsed.resources,
  }
}
