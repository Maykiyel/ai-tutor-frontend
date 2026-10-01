import DOMPurify, { type Config, type UponSanitizeAttributeHookEvent } from 'dompurify'

import { followableUrl } from '../lib/source-url'

/**
 * The second sanitisation layer for model output, and the one ADR-0001 says must
 * never be removed because the first layer is present.
 *
 * The backend sanitises `figure.kind: svg` before storage with
 * `enshrined/svg-sanitize`. That layer has five bypasses in its history, each
 * found after deployment, so a stored copy is not trusted here: it is sanitised
 * again, with a different library, a different codebase, and a different bug
 * history. A bypass in one does not reach the other.
 *
 * This covers rows written before the backend rule existed and any row written
 * by a path that skipped it.
 *
 * Both entry points take the same shape — markup in, safe markup out — and
 * differ only in what they allow through:
 *
 * - `sanitiseLessonSvg` is for markup the **model** wrote. It loses `style`
 *   attributes and `<style>` blocks as well as scripts, because a figure is
 *   allowed to carry meaning and never styling: a payload that could name a
 *   colour, a size, or a spacing could restyle a lesson, and the rule that every
 *   visual value is a theme token would be a claim rather than a fact.
 * - `sanitiseDiagramMarkup` is for markup **mermaid** drew from a theme this app
 *   chose, where the styling is ours rather than the payload's and the diagram
 *   is unreadable without it. It still loses scripts, event handlers, and every
 *   url that is not http or https.
 */
export function sanitiseLessonSvg(source: string): string {
  return sanitise(source, {
    USE_PROFILES: { svg: true },
    FORBID_TAGS: ['style'],
    FORBID_ATTR: ['style'],
  })
}

export function sanitiseDiagramMarkup(svg: string): string {
  return sanitise(svg, { USE_PROFILES: { svg: true } })
}

/**
 * Runs DOMPurify with the `svg` profile, plus one rule the profile does not make
 * for us: a url attribute is only kept when it is http or https.
 *
 * DOMPurify allows `data:` on a handful of image tags, so an `<image href="data:
 * image/svg+xml;...">` survives the profile. That is the same class of decision
 * as a `javascript:` source url, so it is refused by the same helper the rest of
 * the reader uses, rather than by a second, slightly different rule.
 *
 * The hook is added and removed around the call because `sanitize` is
 * synchronous: leaving it installed would quietly change the behaviour of every
 * other DOMPurify call in the app, and this rule is a lesson-figure rule.
 */
function sanitise(source: string, config: Config): string {
  const hook = (_node: Element, data: UponSanitizeAttributeHookEvent) => {
    if (URL_ATTRIBUTES.has(data.attrName.toLowerCase()) && !followableUrl(data.attrValue)) {
      data.keepAttr = false
    }
  }

  DOMPurify.addHook('uponSanitizeAttribute', hook)

  try {
    return DOMPurify.sanitize(source, config)
  } finally {
    DOMPurify.removeHook('uponSanitizeAttribute', hook)
  }
}

/**
 * The attributes an svg can carry a url in. `srcset` and `poster` are html
 * attributes and the svg profile never lets one through, so they are not here.
 */
const URL_ATTRIBUTES = new Set(['href', 'xlink:href', 'src', 'xlink:base'])
