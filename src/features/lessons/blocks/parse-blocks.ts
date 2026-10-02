import {
  blockRegistry,
  isRegisteredBlockType,
  type ParsedLessonBlock,
  type RegisteredBlockType,
} from './registry'

export type SkippedBlock =
  { kind: 'unknown-type'; type: unknown } | { kind: 'malformed'; type: RegisteredBlockType }

/**
 * What the learner is told a skipped block was, in their words rather than the
 * payload's.
 *
 * A malformed block is one of the nine types the app knows, so it can be named. A
 * block of a type the app has never seen cannot: its `type` is a word the payload
 * chose, which may mean nothing to a learner or may be a word the model was talked
 * into, so it is described as what it is to this app rather than echoed.
 */
export function describeSkippedBlock(skipped: SkippedBlock): string {
  return skipped.kind === 'malformed'
    ? `${blockRegistry[skipped.type].name}, in a shape this app cannot read`
    : 'Something this version of the app does not know how to show'
}

export type ParsedBlocks = {
  /** Blocks that parsed, in payload order, ready for the registry. */
  blocks: ParsedLessonBlock[]
  /**
   * One entry per block that did not render, whether its `type` was unknown or
   * its shape was broken. The count is what the reader tells the learner, so a
   * gap never reads as a short lesson.
   */
  skipped: SkippedBlock[]
}

function readType(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return undefined
  }

  return (raw as { type?: unknown }).type
}

/**
 * Parses the `blocks` array **one entry at a time**, never as a whole. This is
 * the single most important rule in the reader: one broken block must not cost
 * the learner the lesson. See ADR-0002.
 *
 * A block whose `type` is not in the registry renders nothing and is not an
 * error — the contract promises unknown types render nothing and get logged. It
 * is still counted as skipped, because from the learner's side a block that
 * rendered nothing and a block the backend sent broken look the same.
 *
 * A block whose `type` is known but whose shape does not validate is skipped and
 * counted, and the surrounding lesson still renders.
 *
 * An unrecognised type is logged once per parse, not once per block: a lesson
 * with forty of the same unknown block is one bug in the backend, and forty
 * identical lines would bury it.
 */
export function parseLessonBlocks(rawBlocks: unknown): ParsedBlocks {
  const blocks: ParsedLessonBlock[] = []
  const skipped: SkippedBlock[] = []
  const loggedTypes = new Set<string>()

  if (!Array.isArray(rawBlocks)) {
    return { blocks, skipped }
  }

  for (const raw of rawBlocks) {
    const type = readType(raw)

    if (!isRegisteredBlockType(type)) {
      if (typeof type === 'string' && !loggedTypes.has(type)) {
        loggedTypes.add(type)
        console.warn(
          `[lesson-reader] unknown lesson block type "${type}": rendered nothing. ` +
            'Add it to the block registry if docs/lesson-schema.json describes it.',
        )
      }

      skipped.push({ kind: 'unknown-type', type })
      continue
    }

    const parsed = blockRegistry[type].schema.safeParse(raw)

    if (!parsed.success) {
      skipped.push({ kind: 'malformed', type })
      continue
    }

    blocks.push({ type, block: parsed.data } as ParsedLessonBlock)
  }

  return { blocks, skipped }
}
