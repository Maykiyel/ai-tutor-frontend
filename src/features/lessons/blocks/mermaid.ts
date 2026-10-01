import type { MermaidConfig } from 'mermaid'

import { sanitiseDiagramMarkup } from './sanitise-svg'

/**
 * The mermaid side of a figure, and the only place in the app that imports
 * mermaid.
 *
 * **Mermaid is several megabytes**, and most lessons the learner opens contain no
 * diagram at all, so it is loaded through a dynamic `import()`: it becomes its
 * own chunk that is fetched the first time a diagram is actually drawn, and never
 * on a lesson that has none. `blocks/mermaid.test.ts` builds the app and checks
 * that the entry chunk really does reach it only through a dynamic import, so the
 * claim is measured rather than asserted.
 *
 * The diagram source is the model's, so mermaid is configured the way ADR-0001
 * requires rather than the way it happens to default:
 *
 * - `securityLevel: 'strict'` — the payload cannot introduce a click callback, so
 *   nothing in a diagram is interactive.
 * - `htmlLabels: false` — a label is text, never markup, and it is drawn without
 *   a `foreignObject` for the browser to run.
 *
 * Both are set explicitly even where they match a default: a default is a
 * decision somebody else can change in a patch release, and this one is a security
 * decision. `maxTextSize` is the last of those — a source that is not a diagram
 * should not be able to spend the learner's cpu before mermaid rejects it.
 *
 * The output is then sanitised once more before it is injected, for the same
 * reason the payload's own svg is: the stored lesson is not trusted, and neither
 * is what a library made out of it.
 */
export async function drawDiagram({
  id,
  source,
  colorScheme,
}: {
  /** Unique per figure on the page: mermaid writes this id into its own markup. */
  id: string
  source: string
  colorScheme: 'light' | 'dark'
}): Promise<string> {
  // The type-only import above is erased at build time, so it does not pull
  // mermaid into any chunk. This dynamic import is the only edge to it.
  const { default: mermaid } = await import('mermaid')

  mermaid.initialize({
    ...diagramConfig,
    // The theme follows the app's colour scheme, which is a theme token rather
    // than anything the payload chose. A diagram drawn for a light page and
    // pasted onto a dark one is a diagram nobody can read.
    theme: colorScheme === 'dark' ? 'dark' : 'default',
  })

  const { svg } = await mermaid.render(id, source)

  return sanitiseDiagramMarkup(svg)
}

const diagramConfig: MermaidConfig = {
  startOnLoad: false,
  securityLevel: 'strict',
  htmlLabels: false,
  maxTextSize: 50_000,
}

/**
 * Mermaid writes the id into `url(#id)` references and into the id of every
 * marker it draws, and it is also a css selector inside the `<style>` block it
 * emits. React's `useId` produces ids containing colons, which are valid in HTML
 * and invalid in a css selector, so the id is reduced to characters both accept.
 */
export function diagramElementId(useIdValue: string): string {
  return `lesson-diagram-${useIdValue.replace(/[^a-zA-Z0-9-]/g, '')}`
}
