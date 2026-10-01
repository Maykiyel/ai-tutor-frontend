import type { ReactElement } from 'react'
import { cleanup, render } from '@testing-library/react'
import { Button, MantineProvider, NavLink, type MantineThemeOverride } from '@mantine/core'
import { afterEach, describe, expect, it } from 'vitest'

import { theme } from './theme'

/**
 * The theme's colours, held to the contrast they are actually rendered at.
 *
 * A theme is easy to get subtly wrong in a way nothing else catches. Every value in
 * `theme.ts` is a hex someone chose by eye, Mantine then resolves it into CSS
 * variables, and the pairing that reaches the screen is decided by a resolver
 * inside Mantine rather than by anything in this repo. So a palette can look
 * deliberate in the source and still ship a button nobody can read.
 *
 * These tests close that gap without reimplementing anything: they render a real
 * `Button` inside the real provider, read the CSS variables Mantine generated for
 * each colour scheme, and resolve the values the element actually carries. If
 * Mantine changes how it resolves a filled variant, these follow it rather than
 * asserting a stale copy of its rules.
 *
 * The bar is WCAG AA for body text, 4.5:1. WCAG 2.2 separately requires 3:1 for a
 * focus indicator and for meaningful non-text boundaries; that is a different
 * requirement and is deliberately not folded in here.
 */

const AA_BODY_TEXT = 4.5

type Scheme = 'light' | 'dark'

// This file renders the provider itself rather than going through
// `renderWithProviders`, because that helper mounts a provider without the theme
// and the theme is the entire subject. It therefore does not get the cleanup that
// helper installs, and Testing Library only auto-cleans when `afterEach` is a
// global — which this project does not enable. Without this, each test's button
// stays in the document and the next one's `getByRole('button')` finds several.
afterEach(cleanup)

/** Mantine emits every variable it generates into one style element. */
function mantineStyleSheet(): string {
  const style = document.querySelector('style[data-mantine-styles]')

  if (!style?.textContent) {
    throw new Error(
      'Mantine generated no CSS variables. The provider has to be rendered before ' +
        'anything can be read out of it.',
    )
  }

  return style.textContent
}

/**
 * The variables that apply in one colour scheme: the shared block, then that
 * scheme's own overrides. Mantine writes shared values under a bare `:root` and
 * per-scheme values under `:root[data-mantine-color-scheme="..."]`.
 */
function variablesFor(scheme: Scheme): Map<string, string> {
  const variables = new Map<string, string>()

  for (const [, selector, body] of mantineStyleSheet().matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const isShared = !selector.includes('data-mantine-color-scheme')
    const isThisScheme = selector.includes(`data-mantine-color-scheme="${scheme}"`)

    if (!isShared && !isThisScheme) {
      continue
    }

    for (const [, name, value] of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      variables.set(name, value.trim())
    }
  }

  return variables
}

/** Follows `var()` references until a literal, the way a browser would. */
function resolve(value: string, variables: Map<string, string>, depth = 0): string {
  const reference = /^var\(\s*(--[\w-]+)\s*\)$/.exec(value.trim())
  const target = reference ? variables.get(reference[1]) : undefined

  if (target === undefined || depth > 10) {
    return value.trim()
  }

  return resolve(target, variables, depth + 1)
}

function luminance(hex: string): number {
  // Mantine writes its own `white` and `black` as `#fff` and `#000`, so the
  // shorthand has to be expanded rather than rejected.
  const shorthand = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(hex)
  const digits = shorthand
    ? `${shorthand[1]}${shorthand[1]}${shorthand[2]}${shorthand[2]}${shorthand[3]}${shorthand[3]}`
    : hex.replace('#', '')

  if (!/^[0-9a-f]{6}$/i.test(digits)) {
    throw new Error(`expected a hex colour, got "${hex}"`)
  }

  const [r, g, b] = [0, 2, 4].map((at) => {
    const ratio = parseInt(digits.slice(at, at + 2), 16) / 255

    return ratio <= 0.03928 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4
  })

  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}

function contrast(foreground: string, background: string): number {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a)

  return (lighter + 0.05) / (darker + 0.05)
}

/** Mantine writes colours as hex throughout; these two arrive as names. */
function toHex(value: string): string {
  if (value === 'white') {
    return '#ffffff'
  }

  if (value === 'black') {
    return '#000000'
  }

  return value
}

/** The custom properties a rendered element carries, read off its style attribute. */
function customProperties(element: Element): Map<string, string> {
  const properties = new Map<string, string>()

  for (const [, name, value] of (element.getAttribute('style') ?? '').matchAll(
    /(--[\w-]+)\s*:\s*([^;]+)/g,
  )) {
    properties.set(name, value.trim())
  }

  return properties
}

/**
 * Renders inside the app's own provider.
 *
 * `deduplicateCssVariables` is off because Mantine otherwise strips any variable
 * whose value equals its own default out of the stylesheet it generates. That is a
 * fine optimisation for a real page and useless here: a filled button's text colour
 * resolves to `--mantine-color-white`, which is exactly one of the stripped ones, so
 * the test would be resolving against a variable that is not there rather than
 * against a colour.
 */
function renderInTheme(ui: ReactElement) {
  return render(
    <MantineProvider theme={theme} env="test" deduplicateCssVariables={false}>
      {ui}
    </MantineProvider>,
  )
}

function renderButton() {
  return customProperties(
    renderInTheme(<Button>Ask for the next lesson</Button>).getByRole('button'),
  )
}

function resolvedPairing(
  properties: Map<string, string>,
  variables: Map<string, string>,
  backgroundProperty: string,
  foregroundProperty: string,
) {
  const bg = toHex(resolve(properties.get(backgroundProperty) ?? '', variables))
  // Mantine's filled variant sets a hover background but no hover text colour, so
  // the label keeps the colour it has at rest. Falling back models what the browser
  // actually paints rather than reporting a failure for a property nobody set.
  const fg = toHex(
    resolve(
      properties.get(foregroundProperty) ?? properties.get('--button-color') ?? '',
      variables,
    ),
  )

  return { bg, fg, ratio: contrast(fg, bg) }
}

describe('the theme is legible', () => {
  it.each<Scheme>(['light', 'dark'])(
    'a filled button label reaches AA against its own background in %s',
    (scheme) => {
      const { bg, fg, ratio } = resolvedPairing(
        renderButton(),
        variablesFor(scheme),
        '--button-bg',
        '--button-color',
      )

      expect(
        ratio,
        `a filled button in ${scheme} is ${fg} on ${bg}, which is ${ratio.toFixed(2)}:1. ` +
          'Either the shade or the text colour has to change.',
      ).toBeGreaterThanOrEqual(AA_BODY_TEXT)
    },
  )

  it.each<Scheme>(['light', 'dark'])(
    'a filled button label still reaches AA on hover in %s',
    (scheme) => {
      const { bg, fg, ratio } = resolvedPairing(
        renderButton(),
        variablesFor(scheme),
        '--button-hover',
        '--button-hover-color',
      )

      expect(
        ratio,
        `a filled button on hover in ${scheme} is ${fg} on ${bg}, which is ` +
          `${ratio.toFixed(2)}:1. Hover is a state a learner sees, so it is held to the ` +
          'same bar as the resting state.',
      ).toBeGreaterThanOrEqual(AA_BODY_TEXT)
    },
  )

  it('the active sidebar row reaches AA in either scheme', () => {
    // Read from the theme rather than from a rendered row: these are plain style
    // declarations, so they land in a class rule rather than an inline attribute,
    // and jsdom will not resolve a class's custom properties back to their values.
    const navLink = (theme as MantineThemeOverride).components?.NavLink?.styles?.root as
      Record<string, string> | undefined

    if (!navLink) {
      throw new Error('the theme no longer declares NavLink styles, so this cannot be checked')
    }

    // Mounted so the provider emits its variables for this test, rather than
    // borrowing them from whichever test happened to render one before it.
    renderInTheme(<NavLink>Lessons</NavLink>)

    for (const scheme of ['light', 'dark'] satisfies Scheme[]) {
      const variables = variablesFor(scheme)
      const bg = toHex(resolve(navLink['--nl-bg'], variables))
      const fg = toHex(resolve(navLink['--nl-color'], variables))
      const ratio = contrast(fg, bg)

      expect(
        ratio,
        `the active sidebar row in ${scheme} is ${fg} on ${bg}, which is ${ratio.toFixed(2)}:1.`,
      ).toBeGreaterThanOrEqual(AA_BODY_TEXT)
    }
  })
})
