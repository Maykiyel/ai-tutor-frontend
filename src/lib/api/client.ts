import axios, { type InternalAxiosRequestConfig } from 'axios'

import { env } from '@/config/env'
import { paths } from '@/config/paths'
import { isAuthEndpoint } from '@/features/auth/api/auth-endpoints'
import { useAuthStore } from '@/features/auth/store'
import { queryClient } from '@/lib/query-client'

function requestInterceptor(config: InternalAxiosRequestConfig) {
  config.headers.Accept = 'application/json'

  const token = useAuthStore.getState().token

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
}

export const apiClient = axios.create({
  baseURL: env.API_URL,
})

apiClient.interceptors.request.use(requestInterceptor)

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const is401 = axios.isAxiosError(error) && error.response?.status === 401

    // A 401 from login/register means the supplied credentials were wrong, not
    // that the session expired. Treating it as an expiry would wipe the whole
    // query cache on every failed sign-in attempt.
    if (is401 && !isAuthEndpoint(error.config?.url)) {
      useAuthStore.getState().clearAuth()
      queryClient.clear()

      const currentPath = window.location.pathname
      const isAuthRoute =
        currentPath === paths.auth.login.path || currentPath === paths.auth.register.path

      if (!isAuthRoute) {
        const redirectTo = `${currentPath}${window.location.search}`
        window.location.assign(paths.auth.login.getHref(redirectTo))
      }
    }

    return Promise.reject(error)
  },
)
