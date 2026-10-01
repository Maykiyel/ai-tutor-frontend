import { useAuthStore } from '../store'

export function useAuth() {
  const { user, token, role, setAuth, clearAuth } = useAuthStore()

  return {
    user,
    token,
    role,
    isAuthenticated: Boolean(token && user),
    setAuth,
    clearAuth,
  }
}
