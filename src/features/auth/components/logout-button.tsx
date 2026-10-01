import { Button } from '@mantine/core'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router'

import { paths } from '@/config/paths'
import { queryClient } from '@/lib/query-client'

import { authMutations } from '../queries/auth-mutations'
import { useAuthStore } from '../store'

export function LogoutButton() {
  const navigate = useNavigate()
  const clearAuth = useAuthStore((state) => state.clearAuth)

  const signOutLocally = async () => {
    clearAuth()
    queryClient.clear()
    await navigate(paths.auth.login.getHref(), { replace: true })
  }

  const mutation = useMutation({
    ...authMutations.logout(),
    // Success and failure are deliberately handled identically: a logout that
    // fails server-side must still clear local auth, otherwise a stale token
    // would remain usable. Do not split these handlers.
    onSettled: signOutLocally,
  })

  return (
    <Button
      variant="subtle"
      color="gray"
      onClick={() => mutation.mutate()}
      loading={mutation.isPending}
      fullWidth
      justify="flex-start"
    >
      Sign out
    </Button>
  )
}
