import type { CSSProperties } from 'react'

/**
 * How the reader marks words a learner can act on, in a channel that is not
 * colour.
 *
 * Mantine underlines an anchor only on hover by default, which leaves a link in
 * running prose distinguished from the words around it by colour alone: a learner
 * who cannot see the colour reads it as an ordinary word, and one on a touch
 * screen never hovers at all. So every link is underlined all the time.
 *
 * A glossary term is not a link. It opens a definition and sends the learner
 * nowhere, so it carries a dotted underline instead — the long-standing mark for
 * "this word has a definition" — and a learner can tell the two apart before
 * pressing either.
 *
 * Inline longhands rather than an `underline` prop, because the hover rule in
 * Mantine's stylesheet would otherwise get the last word, and neither value is a
 * colour, a size or a spacing, so no theme token is being bypassed.
 */
export const linkDecoration: CSSProperties = {
  textDecorationLine: 'underline',
  textDecorationStyle: 'solid',
}

export const termDecoration: CSSProperties = {
  textDecorationLine: 'underline',
  textDecorationStyle: 'dotted',
}
