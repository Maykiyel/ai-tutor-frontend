export const authEndpoints = {
  login: '/api/login',
  register: '/api/register',
  logout: '/api/logout',
} as const

const allAuthEndpoints: readonly string[] = Object.values(authEndpoints)

export function isAuthEndpoint(url: string | undefined): boolean {
  if (!url) {
    return false
  }

  return allAuthEndpoints.includes(url)
}
