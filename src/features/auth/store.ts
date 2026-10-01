import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { AuthSession, User } from './types'

type AuthState = {
  user: User | null
  token: string | null
  role: string | null
  setAuth: (session: AuthSession) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      role: null,
      setAuth: ({ user, token, role }) => set({ user, token, role }),
      clearAuth: () => set({ user: null, token: null, role: null }),
    }),
    {
      name: 'hackathon-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        role: state.role,
      }),
    },
  ),
)
