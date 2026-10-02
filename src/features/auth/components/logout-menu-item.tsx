import { Loader, Menu } from '@mantine/core'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router'

import { paths } from '@/config/paths'
import { queryClient } from '@/lib/query-client'

import { authMutations } from '../queries/auth-mutations'
import { useAuthStore } from '../store'

/**
 * Sign out, as one item in the account menu.
 *
 * It is the menu item itself rather than a button placed inside one. A menu item
 * already renders a `<button>`, and a button inside a button is invalid html: a
 * screen reader meets two controls where the learner pressed one, and the menu's
 * arrow keys land on the outer one while the click handler sits on the inner.
 *
 * While the request is out the item says so in words and ignores a second press.
 * It uses `aria-disabled` rather than `disabled` for that, because a disabled
 * button drops focus to the top of the page, and the learner who pressed Enter
 * should still be where they pressed it.
 */
export function LogoutMenuItem() {
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

  const pending = mutation.isPending

  return (
    <Menu.Item
      closeMenuOnClick={false}
      aria-disabled={pending}
      leftSection={pending ? <Loader size={14} aria-hidden /> : null}
      onClick={() => {
        if (!pending) {
          mutation.mutate()
        }
      }}
    >
      {pending ? 'Signing out' : 'Sign out'}
    </Menu.Item>
  )
}
