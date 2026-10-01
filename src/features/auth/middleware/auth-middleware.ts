import { createContext, redirect, type MiddlewareFunction } from 'react-router'

import { paths } from '@/config/paths'

import { useAuthStore } from '../store'
import type { User } from '../types'

export const authUserContext = createContext<User | null>(null)

export const requireAuth: MiddlewareFunction = ({ request, context }) => {
  const { user, token } = useAuthStore.getState()

  if (!user || !token) {
    const url = new URL(request.url)
    const redirectTo = `${url.pathname}${url.search}`

    throw redirect(paths.auth.login.getHref(redirectTo))
  }

  context.set(authUserContext, user)
}

export const redirectAuthenticated: MiddlewareFunction = ({ context }) => {
  const { user, token } = useAuthStore.getState()

  if (user && token) {
    throw redirect(paths.home.getHref())
  }

  context.set(authUserContext, null)
}
