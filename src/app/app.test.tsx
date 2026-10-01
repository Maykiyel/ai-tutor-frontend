import { cleanup, render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'

import App from './app'
import { AppProviders } from './providers'

/**
 * The app shell must not pin its own colours to one colour scheme.
 *
 * `theme.test.tsx` reads the variables Mantine generates, which is the right way to
 * check a *palette*. It cannot see a colour that bypasses that palette: the shell
 * used to set `bg="gray.3"` and `c="gray.8"` on its main region, which are light
 * scheme shades, and in the dark scheme that gave every screen a near-white page
 * and light-mode text. A code block with its own surface then put that text on a
 * dark background at 1.19:1.
 *
 * Nothing failed, and no variable in the theme was wrong. The bug lived in an
 * inline style, above the cascade the other test inspects. So this one looks
 * directly at what the shell puts on the element, and fails on a pinned shade
 * whatever the reason for it turns out to be.
 */

// This file mounts the real providers rather than going through
// `renderWithProviders`, so it does not pick up the cleanup that helper installs,
// and Testing Library only auto-cleans when `afterEach` is a global — which this
// project does not enable.
afterEach(cleanup)

function renderShell() {
  // A data router, not a `MemoryRouter`: the shell renders `ScrollRestoration`,
  // which calls `useMatches` and refuses to run outside one. This app is in Data
  // Mode, so the test should be too.
  const router = createMemoryRouter([
    {
      path: '/',
      element: <App />,
      children: [{ index: true, element: <p>content</p> }],
    },
  ])

  return render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )
}

/** The `AppShell.Main` region: the element the content is rendered into. */
function contentRegion(container: HTMLElement): HTMLElement {
  const main = container.querySelector('main')

  if (!main) {
    throw new Error('the shell rendered no main region')
  }

  return main as HTMLElement
}

describe('the app shell', () => {
  it('leaves its background and text colour to the colour scheme', () => {
    const { container } = renderShell()
    const style = contentRegion(container).getAttribute('style') ?? ''

    // `--mantine-color-gray-3` and friends: a shade of a ramp rather than a semantic
    // token, so it means one fixed colour in both schemes.
    const pinnedShade = style.match(/--mantine-color-(gray|dark|blue)-\d+/)

    expect(
      pinnedShade,
      `the shell pins its own colours to "${pinnedShade?.[0]}", which is a light scheme ` +
        'shade with no dark counterpart. Use the semantic tokens instead, or leave the ' +
        'defaults to Mantine.',
    ).toBeNull()

    // A literal hex is the same mistake written out longhand.
    expect(style, `the shell sets a literal colour: ${style}`).not.toMatch(/#[0-9a-f]{3,8}/i)
  })

  it('renders the navigation and the content region', () => {
    const { container } = renderShell()

    expect(contentRegion(container)).toBeTruthy()
    expect(container.querySelector('nav, aside')).toBeTruthy()
  })
})
