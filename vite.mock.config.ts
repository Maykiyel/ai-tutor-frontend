import { mergeConfig } from 'vite'

import baseConfig from './vite.config.ts'
import { mockApi } from './mock-api/plugin.ts'

/**
 * The dev server, plus a stand-in backend on the same origin, so the app can be
 * walked in a browser before the Laravel API exists.
 *
 * This is a separate config rather than a flag inside `vite.config.ts` for two
 * reasons. `vitest.config.ts` merges the base config as an object, so a flag would
 * have meant making that export a function and editing a file every other branch and
 * every test run depends on. And a mock you have to remember to switch *off* is a
 * mock that will eventually be switched off in the wrong place: as its own config
 * and its own script, the only way to get fixtures is to ask for them by name.
 *
 * `VITE_API_URL` is pinned to `/` so the app's requests land on this server rather
 * than on whatever `API_URL` happens to be in the developer's env. Nothing outside
 * this config changes, and no env file is involved.
 */
export default mergeConfig(baseConfig, {
  plugins: [mockApi()],
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify('/'),
  },
})
