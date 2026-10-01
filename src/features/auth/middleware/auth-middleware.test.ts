import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RouterContextProvider, type MiddlewareFunction } from 'react-router'

import { paths } from '@/config/paths'

import { authUserContext, redirectAuthenticated, requireAuth } from './auth-middleware'
import { useAuthStore } from '../store'
import type { User } from '../types'

const user: User = { username: 'ada', email: 'ada@example.com' }

/**
 * Both middlewares only read `request` and call `context.set`, and neither
 * calls `next`. A real RouterContextProvider plus a stub `next` is therefore
 * enough to exercise the gate without booting a router.
 *
 * Returns the thrown redirect Response, or null when the middleware allowed
 * the request through.
 */
function run(middleware: MiddlewareFunction, url: string) {
  const context = new RouterContextProvider()
  const next = vi.fn()
  const parsed = new URL(url)

  const args = {
    request: new Request(url),
    url: parsed,
    params: {},
    context,
    pattern: parsed.pathname,
  }

  try {
    middleware(args, next as never)
    return { context, next, response: null }
  } catch (thrown) {
    return { context, next, response: thrown as Response }
  }
}

describe('auth middleware', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.setState({ user: null, token: null, role: null })
  })

  describe('requireAuth', () => {
    it('redirects to login with a redirectTo when there is no session', () => {
      const { response, next } = run(requireAuth, 'http://localhost/dashboard?tab=recent')

      expect(response?.status).toBe(302)
      expect(response?.headers.get('Location')).toBe(
        paths.auth.login.getHref('/dashboard?tab=recent'),
      )
      expect(next).not.toHaveBeenCalled()
    })

    it('redirects even when a token exists without a user', () => {
      useAuthStore.setState({ user: null, token: 'a-token', role: null })

      const { response } = run(requireAuth, 'http://localhost/')

      expect(response?.status).toBe(302)
    })

    it('publishes the authenticated user on context when signed in', () => {
      useAuthStore.setState({ user, token: 'a-token', role: null })

      const { context, response } = run(requireAuth, 'http://localhost/dashboard')

      expect(response).toBeNull()
      expect(context.get(authUserContext)).toEqual(user)
    })
  })

  describe('redirectAuthenticated', () => {
    it('sends signed-in visitors to the workspace list', () => {
      useAuthStore.setState({ user, token: 'a-token', role: null })

      const { response, next } = run(redirectAuthenticated, 'http://localhost/login')

      expect(response?.status).toBe(302)
      expect(response?.headers.get('Location')).toBe(paths.workspaces.root.getHref())
      expect(next).not.toHaveBeenCalled()
    })

    it('lets signed-out visitors through with a null context', () => {
      const { context, response } = run(redirectAuthenticated, 'http://localhost/login')

      expect(response).toBeNull()
      expect(context.get(authUserContext)).toBeNull()
    })
  })
})
