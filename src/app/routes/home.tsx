import { redirect } from 'react-router'

import { paths } from '@/config/paths'

/**
 * The app root is not a screen. Signing in, registering, and opening the app at
 * `/` all belong on the workspace list — see the landing route in
 * docs/AI-TUTOR-FRONTEND-ONBOARDING.md.
 */
export function homeRedirect() {
  return redirect(paths.workspaces.root.getHref())
}
