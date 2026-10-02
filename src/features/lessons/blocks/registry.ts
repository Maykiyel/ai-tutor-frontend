import type { ComponentType } from 'react'

import {
  calloutBlockSchema,
  codeBlockSchema,
  figureBlockSchema,
  headingBlockSchema,
  paragraphBlockSchema,
  quizBlockSchema,
  recallBlockSchema,
  stepsBlockSchema,
  tableBlockSchema,
  type LessonBlock,
} from '../schemas/lesson-schema'
import { CalloutBlockView } from './components/callout-block'
import { CodeBlockView } from './components/code-block'
import { FigureBlockView } from './components/figure-block'
import { HeadingBlockView } from './components/heading-block'
import { ParagraphBlockView } from './components/paragraph-block'
import { QuizBlockView } from './components/quiz-block'
import { RecallBlockView } from './components/recall-block'
import { StepsBlockView } from './components/steps-block'
import { TableBlockView } from './components/table-block'

/**
 * A block component takes the parsed block and nothing else. Anything a block
 * needs from the wider response — the hydrated maps, the lesson it belongs to —
 * reaches it through context, so adding a block type never means changing the
 * props every existing block takes.
 */
export type BlockComponent<TBlock extends LessonBlock> = ComponentType<{ block: TBlock }>

/**
 * One map from block `type` to the schema that validates it and the component
 * that renders it. The contract says the `type` field is the only link between
 * backend and UI, so this is that link and nothing else: every other field on a
 * block is a prop on the parsed value.
 *
 * **Adding a block type is one component plus one registry entry.** Write the
 * schema and the component, add one line below, and add the block to the
 * `LessonBlock` union. There is no switch elsewhere to extend and no list to keep
 * in step, which is what keeps the reader's tolerance for unknown types working as
 * the format grows. The full checklist is in `README.md` beside this file.
 *
 * The map is typed by inference, not annotated: `satisfies` against the union of
 * block types would have to claim each entry accepts `unknown`, which no typed
 * component does. Inferred types keep each entry tied to its own schema, which is
 * what makes `ParsedLessonBlock` distribute correctly.
 */
export const blockRegistry = {
  paragraph: { schema: paragraphBlockSchema, Component: ParagraphBlockView },
  heading: { schema: headingBlockSchema, Component: HeadingBlockView },
  callout: { schema: calloutBlockSchema, Component: CalloutBlockView },
  code: { schema: codeBlockSchema, Component: CodeBlockView },
  figure: { schema: figureBlockSchema, Component: FigureBlockView },
  table: { schema: tableBlockSchema, Component: TableBlockView },
  steps: { schema: stepsBlockSchema, Component: StepsBlockView },
  quiz: { schema: quizBlockSchema, Component: QuizBlockView },
  recall: { schema: recallBlockSchema, Component: RecallBlockView },
}

export type RegisteredBlockType = keyof typeof blockRegistry

/**
 * A block that parsed, tagged with its registry key. The union is distributed
 * over the registry keys, so the `code` arm carries a code block and the
 * `heading` arm a heading, and a block can never be rendered by the wrong
 * component.
 */
export type ParsedLessonBlock = {
  [K in RegisteredBlockType]: {
    type: K
    block: Extract<LessonBlock, { type: K }>
  }
}[RegisteredBlockType]

/**
 * True only for a type this build has a component for.
 *
 * The registry is now the contract's nine types in full, so a block this function
 * rejects is a type the format does not define rather than one the app is behind
 * on. The two take the same path anyway — it renders nothing, is counted as
 * skipped so the learner is told, and is logged — so a tenth type invented by a
 * model, or a lesson written by a backend on a newer format, still reads as a
 * lesson with a gap in it rather than as a broken page.
 */
export function isRegisteredBlockType(type: unknown): type is RegisteredBlockType {
  return typeof type === 'string' && Object.hasOwn(blockRegistry, type)
}
