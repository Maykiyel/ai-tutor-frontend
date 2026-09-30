# Hackathon Frontend Starter Kit

A frontend starter for quickly bootstrapping hackathon projects with React, TypeScript, Vite, React Router Data Mode, Mantine, TanStack Query, Axios, Zod, React Hook Form, and Zustand.

## Quick start

```bash
pnpm install
cp .env.example .env
pnpm dev
```

## Stack

- React + TypeScript
- Vite
- React Router Data Mode
- Mantine
- TanStack Query
- Axios
- Zod
- React Hook Form
- Zustand
- Vitest + React Testing Library
- Prettier
- Oxlint

## Project structure

```text
src/
├── app/
│   ├── app.tsx
│   ├── error-boundary.tsx
│   ├── providers.tsx
│   ├── router.tsx
│   └── routes/
│
├── components/
│   ├── layout/
│   │   ├── app-header.tsx
│   │   ├── app-sidebar.tsx
│   │   └── page-container.tsx
│   └── ui/
│       ├── empty-state.tsx
│       ├── error-state.tsx
│       ├── loading-state.tsx
│       └── page-loader.tsx
│
├── config/
│   └── env.ts
│
├── features/
│   ├── example/       # disposable reference feature
│   └── <feature>/
│
├── lib/
│   ├── api/
│   │   └── client.ts
│   └── query-client.ts
│
└── test/
    ├── setup.ts
    └── test-utils.tsx
```

## Conventions

Shared components live in `src/components`. Feature-specific UI, API functions, schemas, and query definitions live under `src/features/<feature>`.

Use Mantine primitives directly. Add a shared component only when the behavior or presentation is used across features.

For TanStack Query, keep API functions and `queryOptions` / `mutationOptions` definitions inside the owning feature. The global query client only owns application-wide defaults.

Create the React Router Data Mode router in `src/app/router.tsx` and keep route definitions there.

Use React Hook Form with Zod for validated forms. `src/features/example` contains a disposable reference implementation.

Write component tests with Vitest and React Testing Library. Use `src/test/test-utils.tsx` when a test needs the app providers.

## Feature example

`src/features/example` demonstrates:

- feature-owned API functions
- `queryOptions` for queries
- `mutationOptions` for mutations
- React Hook Form + Zod validation
- feature-local components and schemas

Remove this directory when starting a real project.

## Commands

```bash
pnpm dev
pnpm build
pnpm typecheck
pnpm lint
pnpm lint:fix
pnpm test
pnpm test:watch
pnpm format
pnpm format:check
pnpm check
```

## Environment variables

Copy `.env.example` to `.env` and set the values required by your app.

Only variables prefixed with `VITE_` are exposed to browser code. Do not put secrets in Vite environment variables.

## CI

GitHub Actions runs typecheck, lint, formatting, tests, and the production build on pushes to `main` and pull requests.
