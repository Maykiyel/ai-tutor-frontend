import axios, { type InternalAxiosRequestConfig } from 'axios'

import { env } from '@/config/env'

function requestInterceptor(config: InternalAxiosRequestConfig) {
  config.headers.Accept = 'application/json'
  config.withCredentials = true

  return config
}

export const apiClient = axios.create({
  baseURL: env.API_URL,
})

apiClient.interceptors.request.use(requestInterceptor)
