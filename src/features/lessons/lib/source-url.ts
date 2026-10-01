/**
 * Which urls the app is willing to follow.
 *
 * Lesson payloads are model output, and a source record's url is whatever the
 * model read off a web search result. Only `http` and `https` are followed, and
 * everything else — `javascript:`, `data:`, `vbscript:`, a bare word — is refused
 * so the caller can render the segment's own words instead of a link that runs
 * script in the learner's browser. See ADR-0001.
 *
 * Returns the url unchanged rather than a normalized form: what the learner
 * clicks should be what the source record holds.
 */
export function followableUrl(url: string): string | null {
  let parsed: URL

  try {
    parsed = new URL(url)
  } catch {
    return null
  }

  return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? url : null
}

/**
 * The attributes every outbound source link carries. A source is somebody else's
 * page, so it opens away from the app and cannot reach back through
 * `window.opener` into it.
 */
export const externalLinkAttributes = {
  target: '_blank',
  rel: 'noopener noreferrer',
} as const
