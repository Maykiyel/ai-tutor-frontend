import axios from 'axios'

import { apiClient } from '@/lib/api/client'

import type { AuthSession, User } from '../types'
import { authEndpoints } from './auth-endpoints'

export type LoginInput = {
  username: string
  password: string
}

export type RegisterInput = {
  username: string
  password: string
  password_confirmation: string
}

type ApiSuccess<T> = {
  message: string
  data: T
}

type LoginResponse = {
  user: User
  token: string
  role: string | null
}

export async function login(input: LoginInput): Promise<AuthSession> {
  const response = await apiClient.post<ApiSuccess<LoginResponse>>(authEndpoints.login, input)

  return response.data.data
}

export async function register(input: RegisterInput): Promise<User> {
  const response = await apiClient.post<ApiSuccess<User>>(authEndpoints.register, input)

  return response.data.data
}

export async function logout(): Promise<void> {
  await apiClient.post(authEndpoints.logout)
}

export function getAuthErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | {
          message?: string
          errors?: Record<string, string[]>
        }
      | undefined

    const validationMessage = data?.errors ? Object.values(data.errors).flat()[0] : undefined

    return validationMessage ?? data?.message ?? error.message
  }

  return error instanceof Error ? error.message : 'Something went wrong.'
}
