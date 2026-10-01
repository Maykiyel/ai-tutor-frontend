export type User = {
  username: string
  email: string | null
}

export type AuthSession = {
  user: User
  token: string
  role: string | null
}
