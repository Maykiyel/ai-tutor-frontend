import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Route, Routes } from 'react-router'

import { paths } from '@/config/paths'
import { renderWithRouter, screen, within } from '@/test/test-utils'

import { logout } from '../api/auth-api'
import { useAuthStore } from '../store'
import { AuthMenu } from './auth-menu'

// The seam: the feature's own API module, stubbed. The menu, the mutation, the
// store and the redirect are the real thing.
vi.mock('../api/auth-api')

function renderSignedIn() {
  useAuthStore.getState().setAuth({
    user: { username: 'ada', email: null },
    token: 'test-token',
    role: null,
  })

  return renderWithRouter(
    <Routes>
      <Route path={paths.home.path} element={<AuthMenu />} />
      <Route path={paths.auth.login.path} element={<p>The sign in page</p>} />
    </Routes>,
    [paths.home.getHref()],
  )
}

describe('AuthMenu', () => {
  beforeEach(() => {
    vi.mocked(logout).mockReset()
    useAuthStore.getState().clearAuth()
  })

  it('signs out from the keyboard through one menu item that says it is working', async () => {
    const learner = userEvent.setup()
    let finishLogout: () => void = () => {}
    vi.mocked(logout).mockReturnValue(
      new Promise<void>((resolve) => {
        finishLogout = resolve
      }),
    )

    renderSignedIn()

    // The menu is reached by Tab rather than by reaching for the element, so this
    // proves a keyboard learner can get to it at all.
    await learner.tab()
    const trigger = screen.getByRole('button', { name: 'Account menu, signed in as ada' })
    expect(trigger).toHaveFocus()

    await learner.keyboard('{Enter}')

    const menu = await screen.findByRole('menu')
    const signOut = within(menu).getByRole('menuitem', { name: 'Sign out' })

    // One control, not a button inside a button: a nested button is invalid html,
    // and a screen reader meets two controls where the learner pressed one.
    expect(within(signOut).queryByRole('button')).toBeNull()

    for (let presses = 0; presses < 5 && document.activeElement !== signOut; presses += 1) {
      await learner.keyboard('{ArrowDown}')
    }
    expect(signOut).toHaveFocus()

    await learner.keyboard('{Enter}')

    // While the request is out, the item says so in words and refuses a second
    // press, and keeps focus so the learner is not dropped back at the top.
    const pending = screen.getByRole('menuitem', { name: 'Signing out' })
    expect(pending).toHaveAttribute('aria-disabled', 'true')
    expect(pending).toHaveFocus()

    await learner.keyboard('{Enter}')
    expect(logout).toHaveBeenCalledTimes(1)

    finishLogout()

    expect(await screen.findByText('The sign in page')).toBeInTheDocument()
    expect(useAuthStore.getState().token).toBeNull()
  })
})
