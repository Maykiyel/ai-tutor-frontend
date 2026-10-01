# ai-tutor-frontend

Frontend for the AI tutor, built on the Hackathon Frontend Starter Kit: React 19, TypeScript, Vite, React Router Data Mode, Mantine, TanStack Query, Axios, Zod, React Hook Form, Zustand. Backend is a Laravel API issuing Sanctum personal access tokens.

## Commands

```bash
pnpm dev            # start the dev server
pnpm check          # typecheck + lint + format:check + test + build
```

Use `pnpm check` before declaring work done. Individual steps: `pnpm typecheck`, `pnpm lint`, `pnpm format`, `pnpm test`, `pnpm build`.

## Conventions

**Feature boundaries.** Shared components live in `src/components`. Feature-specific UI, API functions, schemas, and query definitions live under `src/features/<feature>`. Do not import from one feature into another; promote to `src/components` or `src/lib` when two features genuinely need the same thing.

**Mantine.** Use Mantine primitives directly. Add a component under `src/components/ui` only when the behavior or presentation is actually shared across features.

**Data fetching.** Keep API functions and `queryOptions` / `mutationOptions` definitions inside the owning feature. The global `queryClient` in `src/lib/query-client.ts` owns application-wide defaults only.

**Routing.** Create and own the router in `src/app/router.tsx`. Add route paths to `src/config/paths.ts` rather than hardcoding URLs, so redirects and auth middleware stay in sync.

**Forms.** React Hook Form with Zod for validation. Schemas go in `src/features/<feature>/schemas`.

**Environment.** Validate env through the Zod schema in `src/config/env.ts`; never read `import.meta.env` directly outside that file. Set `VITE_API_URL` to the Laravel server origin **without** `/api` — API functions append their own `/api/...` segment.

**Auth.** Auth state is a Zustand store in `src/features/auth/store.ts`. The shared Axios client (`src/lib/api/client.ts`) attaches the Bearer token, and a non-auth 401 clears both auth state and the query cache. A 401 from login/register is treated as bad credentials, not an expired session. Preserve that distinction when touching the interceptor.

**Tests.** Vitest and React Testing Library, with tests colocated next to the file under test (`foo.tsx` → `foo.test.tsx`). Use `src/test/test-utils.tsx` when a test needs the app providers. `src/features/example` is the disposable reference feature: mirror its structure, and delete it once real features land.

**Style.** Prettier, single quotes, no semicolons, trailing commas, 100 column width. Oxlint enforces rules-of-hooks. Both run in CI alongside typecheck, tests, and the build.

## Agent skills

### Issue tracker

Issues live in GitHub Issues on `Maykiyel/ai-tutor-frontend`, managed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, each label string equal to its name. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one root `GLOSSARY.md` plus `docs/adr/`. See `docs/agents/domain.md`.
