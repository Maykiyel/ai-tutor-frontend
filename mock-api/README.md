# Mock API

Walks the app in a browser before the Laravel API exists.

```bash
pnpm dev:mock
```

`pnpm dev` is untouched and still talks to a real backend.

Sign in with any username. The password is not checked.

## What is in it

Ten lessons in workspace 1, two in workspace 2, drawn from the fixtures in
`src/features/lessons/fixtures` — the same files the tests use. Every block type
is walkable, including the one that looks alarming and is not: _"A figure the model
was talked into"_ carries a script element, event handlers, and a `javascript:`
url, and the reader's own sanitiser is what stands between it and the document.

Workspace 2 has a superseded mission, so the next-lesson action is disabled there
and the screen has to say why. Asking for the next lesson in workspace 1 answers
`202` and the lesson appears in the list about seven seconds later, which is what
makes the waiting state and its polling visible.

Submitting a lesson grades it after a second and a half. Quiz answers are graded
for real from the fixture. Recall answers are not: the fixtures are lesson responses,
so their expected answer and rubric were stripped before the file was written. A
written recall comes back as received with a note saying the mock did not grade it,
and an empty one comes back wrong. Steps are accepted and never graded, as the
contract says. An answer id the lesson does not have answers `422`.

An unknown id answers `404` with a message listing what the mock does serve, so a
missing endpoint is obvious rather than mysterious.

## Why it is not a test seam

`AGENTS.md` agrees one way of testing features: stub the feature's own API module
with a fixture. This is not that, and it is not a second version of it. It is
developer scaffolding for a human, so it lives outside `src/` and outside the app's
module graph entirely — it cannot reach a production bundle by construction rather
than by remembering. `pnpm build` never sees it, and `pnpm test` never loads it.

Its own config file and its own script, rather than a flag in `vite.config.ts`,
because `vitest.config.ts` merges that config as an object and because a mock you
have to remember to switch _off_ is a mock that will eventually be switched off in
the wrong place. Here the only way to get fixtures is to ask for them by name.

## When the real API arrives

Delete the directory, the config, and the script. Nothing in `src/` refers to any
of it, so there is nothing to unwind in the app.

Note that the response shapes here are the frontend's guesses, not agreements —
`workspace-schema.ts`, `mission-schema.ts`, and `lesson-list-schema.ts` each say so
in their own doc comment. The first divergence is a commit to
`docs/lesson-schema.json`, exactly like any other contract change.
