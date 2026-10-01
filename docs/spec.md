# AI tutor app, version one

Status: draft. The user stories are a **target product, not a committed V1 scope**. See
[V1 cut](#v1-cut) before treating any story as ready to build.

## Problem Statement

People who want to learn a skill have two bad options. Courses and videos give knowledge but don't adapt to why the learner wants it, what they already know, or what they have forgotten. General chatbots adapt, but they answer from memory, forget the learner between sessions, and can't tell the difference between a learner who was shown something and a learner who understood it.

The learner wants a tutor that knows their goal, teaches only what they are ready for, grounds every claim in sources they can check, and remembers what they have proven they understand.

## Solution

A web app where a learner opens a workspace for one topic and states a concrete mission. The app interviews them until the mission is clear, finds and annotates trusted sources, and then teaches in short interactive lessons. Each lesson targets one skill just past what the learner already knows, cites its sources, and ends with practice that gives instant feedback.

The app keeps a record of what the learner has shown they understand, builds a glossary from terms they can use correctly, and distils lessons into reference sheets. It schedules review so knowledge lasts. The model writes the lessons and grades the answers. The backend keeps the model grounded and keeps the learner's state correct.

The design comes from the `teach` skill by Matt Pocock. The skill runs this workflow in a folder of files for one learner. This app turns it into a multi-user product.

## Companion documents

Domain vocabulary is defined once in [`GLOSSARY.md`](../GLOSSARY.md) at the repo root.
This document links to it rather than restating it.

- [`GLOSSARY.md`](../GLOSSARY.md) — the vocabulary of the product
- [`docs/lesson-schema.json`](lesson-schema.json) — **the shared contract.** The lesson
  format and the attempt contract, as a JSON Schema both sides read
- [`docs/lesson-format.md`](lesson-format.md) — prose explaining the format and why
- [`docs/AI-TUTOR-FRONTEND-ONBOARDING.md`](AI-TUTOR-FRONTEND-ONBOARDING.md) — the
  frontend's view of the contract
- [`docs/backend-onboarding.md`](backend-onboarding.md) — the backend's view, trimmed to
  what the frontend depends on
- [`docs/adr/`](adr/) — decisions that constrain the implementation

## User Stories

### Authentication

1. As a learner, I want to create an account, so that my learning is mine.
2. As a learner, I want to sign in, so that I can pick up where I left off.
3. As a learner, I want to sign out, so that I can use a shared machine safely.
4. As a learner, I want to stay signed in across visits, so that I am not asked to log in every day.

### Workspaces and mission

5. As a learner, I want to create a workspace for one topic, so that my learning stays separate from my other goals.
6. As a learner, I want to keep more than one workspace, so that unrelated goals don't mix.
7. As a learner, I want the tutor to ask why I want to learn the topic, so that lessons connect to what I actually need.
8. As a learner, I want the tutor to push back when my reason is vague, so that I end up with a concrete goal.
9. As a learner, I want my mission shown as a short card with the goal, success criteria, constraints, and out-of-scope topics, so that I can check it matches my intent.
10. As a learner, I want to confirm the mission before it is saved, so that the tutor never steers me with something I didn't agree to.
11. As a learner, I want to change my mission when my goal changes, so that lessons follow what I care about now.
12. As a learner, I want to confirm every mission change, so that the tutor never rewrites my goal on its own.
13. As a learner, I want to mark topics as out of scope, so that lessons stay inside what I can handle.
14. As a learner, I want to tell the tutor how I like to be taught, so that lessons match my style.

### Sources and communities

15. As a learner, I want the tutor to find trusted sources before it teaches, so that lessons rest on reliable knowledge.
16. As a learner, I want each source to say what it covers and when to use it, so that I know which one to open.
17. As a learner, I want to remove a source I find shallow or wrong, so that the list stays sharp.
18. As a learner, I want to see gaps where no good source exists, so that I know what the tutor can't teach well yet.
19. As a learner, I want to add a source I already trust, so that the tutor uses material I value.
20. As a learner, I want to see communities where I can practice with others, so that I can test my skills in the real world.
21. As a learner, I want to opt out of communities, so that the tutor stops suggesting them.

### Lessons

22. As a learner, I want to ask for the next lesson, so that I always have something to do.
23. As a learner, I want the next lesson to sit just beyond what I know, so that I feel challenged but not lost.
24. As a learner, I want to ask for a specific topic instead, so that I can follow my own curiosity.
25. As a learner, I want each lesson to take 15 minutes or less, so that I can fit it into a day.
26. As a learner, I want each lesson to give me one clear win, so that I can see progress.
27. As a learner, I want each lesson to say how it ties to my mission, so that the work doesn't feel abstract.
28. As a learner, I want claims in a lesson to link to a source, so that I can check them.
29. As a learner, I want each lesson to recommend one primary source, so that I know what to read or watch next.
30. As a learner, I want glossary terms inside a lesson to show their definition on hover, so that I don't lose my place.
31. As a learner, I want links to earlier lessons and reference sheets, so that I can review without searching.
32. As a learner, I want a clear waiting state while a lesson is generated, so that I know it is coming.
33. As a learner, I want to leave and come back while a lesson generates, so that I am not held on the page.
34. As a learner, I want to ask the tutor a follow-up question from any lesson, so that I'm never stuck on something unclear.
35. As a learner, I want hands-on lessons that walk me through real-world steps, so that I can practice skills outside the screen.

### Practice and feedback

36. As a learner, I want quiz feedback right after I answer, so that I can correct myself while it is fresh.
37. As a learner, I want quiz answers that look alike in length, so that I can't guess from formatting.
38. As a learner, I want to answer recall prompts from memory, so that the lesson builds lasting retention.
39. As a learner, I want feedback on my recall answers against what the lesson expected, so that I see what I missed.
40. As a learner, I want to tick off steps in a hands-on lesson, so that I can follow a real-world task.
41. As a learner, I want review lessons that ask me to recall earlier topics, so that I keep what I learned.
42. As a learner, I want practice that mixes related earlier material, so that my skills stay flexible.
43. As a learner, I want to see what is due for review, so that I know what to practice today.

### Records, glossary, and reference

44. As a learner, I want the tutor to remember what I've shown I understand, so that it doesn't re-teach it.
45. As a learner, I want to tell the tutor what I already know, so that it starts at the right level.
46. As a learner, I want corrected misconceptions noted, so that the tutor watches for related mistakes.
47. As a learner, I want to read my learning records in a timeline, so that I can see how my understanding grew.
48. As a learner, I want outdated records marked as replaced instead of deleted, so that I can see how my understanding changed.
49. As a learner, I want a term added to my glossary only when I use it correctly, so that the glossary reflects what I know.
50. As a learner, I want to write my own definition of a term, so that writing it proves I understand it.
51. As a learner, I want one preferred word per concept with the aliases to avoid, so that language stays consistent.
52. As a learner, I want the tutor to use my glossary terms in every lesson, so that wording stays consistent.
53. As a learner, I want cheat sheets distilled from my lessons, so that I can look things up fast.
54. As a learner, I want reference pages that print cleanly, so that I can keep a copy offline.
55. As a learner, I want to record how I like to be taught and opt out of communities, so that the tutor stops asking.
56. As a learner, I want to delete my workspace and my answers, so that I control my data.

### Operators and developers

57. As an operator, I want every model call logged with prompt version, input, output, and cost, so that I can debug problems and control spend.
58. As an operator, I want lessons that fail validation rejected and regenerated, so that learners never see malformed lessons.
59. As an operator, I want a daily cap on lessons per learner, so that cost stays predictable.
60. As an operator, I want fetched web pages treated as data only, so that a page can't change missions, records, or the glossary.
61. As an operator, I want inline SVG in figures sanitized before storage, so that a hostile lesson cannot execute script in a learner's browser.
62. As a backend developer, I want a fixed list of lesson blocks, so that I can validate every lesson.
63. As a frontend developer, I want unknown block types to render nothing and get logged, so that a new lesson format never crashes the page.
64. As a frontend developer, I want one malformed block to not take down the lesson, so that a single bad block still leaves a readable page.
65. As a developer, I want a short checklist for adding a block type, so that the format can grow without breaking old lessons.

## V1 cut

**The 65 stories above are the target product. They are not committed scope.** The V1
build follows the order in
[`docs/AI-TUTOR-FRONTEND-ONBOARDING.md`](AI-TUTOR-FRONTEND-ONBOARDING.md#suggested-build-order),
which runs renderer first, then the surrounding product.

Stories inside that order for V1: 1-14, 22-41, 44-56, and 62-65. The rest are backlog.

### Marking a story ready

Apply the `ready-for-agent` label to **individual stories**, not to this document. The
label means an agent can pick the story up and finish it without asking a question, so
it says nothing true about a list nobody has reviewed one by one yet.

## Implementation Decisions

Decisions are grouped by owner. Where a decision is **shared**, neither side can change
it alone and any change must land in
[`docs/lesson-schema.json`](lesson-schema.json) first.

### Shared

- One workspace holds one learner, one topic, and one mission. A learner with
  unrelated goals has several workspaces.
- The model never talks to the browser directly. Every model call runs in the backend
  so the rules below can be enforced.
- **The lesson format and attempt contract live in
  [`docs/lesson-schema.json`](lesson-schema.json).** Prose in any document is
  explanatory; the schema is authoritative. Both sides parse against it.
- **Contract changes travel through a commit to that file in this repository.** The
  backend developer reads it here. A change that is not in the schema has not happened.
- Lessons arrive whole. Generation runs as a queued job, the request returns 202, and
  the frontend polls the lesson list. No streaming.
- The attempt contract carries no aggregate score. The frontend computes any summary
  from `perAnswer`, because one number two repositories must agree on is a number that
  eventually disagrees.
- Answers are a discriminated union. `steps` answers are ungraded telemetry and never
  appear in `perAnswer`.

### Backend

- The frontend is React with TypeScript. The backend is a Laravel API. Both are
  decided.
- **Workspace. Owns everything else and carries the learner's teaching notes and the
  community opt-out.** All authorization goes through workspace ownership.
- **Mission.** Stored as revisions, with exactly one active per workspace. Holds the
  reason, success criteria, constraints, and out-of-scope topics. A change needs
  explicit learner confirmation and creates a learning record.
- **Mission interview.** A chat that runs when a workspace has no active mission. It
  keeps asking until the reason is concrete, then proposes a mission draft for the
  learner to confirm.
- **Resources and source finder.** Resources are knowledge or wisdom entries with a
  required annotation. The finder uses web search and proposes entries. Pruned
  resources are soft-removed so old lessons still resolve their citations. Gaps are
  tracked explicitly.
- **Topic picker.** Reads the mission, learning records, and glossary, and returns the
  next skill, a lesson kind, and a short rationale. It aims for the learner's zone of
  proximal development and avoids repeats.
- **Lesson writer.** Produces lesson JSON from the mission, topic, resources, glossary,
  and records. Knowledge claims come from workspace resources, never from the model's
  own memory.
- **Lesson validator.** Rejects lessons that break the rules in
  [`docs/lesson-format.md`](lesson-format.md#validation-rules). A rejected lesson is
  regenerated. The retry limit is open.
- **Attempts and grader.** Multiple choice is graded in the backend. Recall answers go
  to a grader call that returns per-answer feedback, an optional record candidate, and
  glossary candidates.
- **Learning records.** Numbered per workspace. Created only on evidence. Contradicted
  records are marked superseded and kept.
- **Glossary.** A term is promoted only after the learner uses it correctly, ideally by
  writing its definition. Each term has a preferred word and aliases to avoid.
- **Reference docs.** Distilled from lessons, built from the same blocks without
  practice.
- **Review scheduler.** A queued job that computes what is due from learning records
  and attempts. The algorithm is open.
- **Tutor chat.** Answers follow-up questions with workspace context. Questions that
  need real-world practice are delegated to a listed community.
- **Figure sanitization.** Inline SVG is sanitized twice: by the backend with
  `enshrined/svg-sanitize` `>=0.22.0` before storage, and again by the frontend with
  DOMPurify. See [ADR-0001](adr/0001-render-untrusted-model-output.md).

### Frontend

- **Block registry.** One registry from block `type` to a React component. `type` is
  the only link between backend and UI; every other field is a prop.
- **Tolerant rendering.** An unknown block type renders nothing and is logged. Blocks
  parse one at a time, so a single malformed block is skipped and the rest still
  render. A `schemaVersion` newer than the app renders a banner, not a refusal. See
  [ADR-0002](adr/0002-lesson-schema-versioning.md).
- **Hydration.** `termId`, `resourceId`, and `targetId` are database ids, and the
  lesson response includes the records they point to, so the frontend needs no extra
  requests.
- **Quiz neutrality.** Options render identically: same size, same weight, no
  hover-differentiation between them, no reordering tied to correctness. The backend
  equalises word counts; the UI must not add a clue back.
- **Accessibility is part of a block, not a pass at the end.** Keyboard operation for
  every practice block, hover cards that open on focus, live regions for quiz
  feedback, no colour-only signalling, real `alt` text from the figure.
- **Print styling** for reference docs, developed alongside the reference doc screen.

### Modules

Module ownership sits with the backend and is listed here for reference; the frontend
mirrors it as features under `src/features/`.

| Module                      | Owns                                                                    |
| --------------------------- | ----------------------------------------------------------------------- |
| Workspace                   | Everything else; teaching notes; community opt-out; all authorization   |
| Mission                     | Revisions, one active per workspace; the interview                      |
| Resources and source finder | Annotated sources, pruning, gaps                                        |
| Topic picker                | Next skill, lesson kind, rationale                                      |
| Lesson writer and validator | Lesson JSON; the validation rules                                       |
| Attempts and grader         | Multiple choice grading; recall grading; record and glossary candidates |
| Learning records            | Numbered evidence, superseded not deleted                               |
| Glossary                    | Promotion after correct use; preferred word and aliases                 |
| Reference docs              | Distillation without practice blocks                                    |
| Review scheduler            | The due queue                                                           |
| Tutor chat                  | Follow-up answers; delegation to communities                            |

## Data

- New tables for users, workspaces, missions, resources, lessons, lesson attempts,
  learning records, glossary terms, and reference docs. Every table except users
  belongs to a workspace.
- Users are keyed by `username` and `email`, matching the implemented auth. There is no
  `name` column.
- Lesson content is a JSON column validated before save, carrying `schemaVersion`.
- Learning records carry a per-workspace number, a status, an optional superseded-by
  link, and an optional link to the attempt that evidences them.
- Resources carry a `title`, a kind, a url, an annotation, and a status that supports
  soft pruning. **A source needs a title:** a citation without one is unusable in the
  lesson renderer, and the hydrated response returns one.
- Lessons carry no `primary_source_url`. The primary source is resolved through
  `primarySource.resourceId`, which is what the validator rule and the pruning story
  both need.

## Rules for records and glossary

- A learning record is written only when the learner shows non-trivial understanding,
  discloses prior knowledge, has a misconception corrected, or changes the mission.
  Coverage alone does not count, and records are not an activity log.
- A record candidate with no evidence is discarded.
- Glossary candidates pass the same evidence check before a term is added.
- A glossary candidate carries the proposed term text, not an id. A term that does not
  exist yet has no id; `termId` appears only when updating a term that does.

## API contracts

```
POST   /api/workspaces
GET    /api/workspaces/{id}
PATCH  /api/workspaces/{id}                  teaching notes, community opt-out
DELETE /api/workspaces/{id}                  story 56, subject to the retention rule

POST   /api/workspaces/{id}/mission-interview/messages
GET    /api/workspaces/{id}/mission
PUT    /api/workspaces/{id}/mission          needs confirmed: true

GET    /api/workspaces/{id}/resources
POST   /api/workspaces/{id}/resources        learner-supplied url + annotation
POST   /api/workspaces/{id}/resources/search queued, returns 202
PATCH  /api/resources/{id}                   includes pruning

POST   /api/workspaces/{id}/lessons/next     queued, returns 202
GET    /api/workspaces/{id}/lessons
GET    /api/lessons/{id}
POST   /api/lessons/{id}/attempts            grades, may create a record

GET    /api/workspaces/{id}/learning-records
GET    /api/workspaces/{id}/glossary
GET    /api/workspaces/{id}/reference-docs
GET    /api/workspaces/{id}/reviews/due
POST   /api/workspaces/{id}/tutor/messages
```

All paths carry the `/api` prefix, matching `src/lib/api/client.ts` and the endpoint
modules in `src/features/auth/`.

> **Pending backend agreement.** `PATCH /api/workspaces/{id}`,
> `DELETE /api/workspaces/{id}`, and `POST /api/workspaces/{id}/resources` are **not yet
> agreed with the backend developer.** They are listed because stories 19, 21, 55, and
> 56 have no endpoint without them. Do not build against them until confirmed.

## AI calls and safety

- Six call types: mission interview, topic picker, source finder, lesson writer,
  grader, tutor chat. Each uses structured output with a JSON Schema written for it,
  and each result is checked by the backend before use.
- Prompts live in versioned files. Every call is logged with prompt version, input,
  output, and cost.
- Web search results are untrusted. Page text goes to the model as data only, and it
  can never trigger tools or change missions, records, or the glossary.
- Citations are verified. The cited resource must exist and its url must resolve.
- **Rendered model output is untrusted too.** See
  [ADR-0001](adr/0001-render-untrusted-model-output.md).
- Lesson generation runs as a queued job because it can take seconds to minutes.
- A daily lesson cap per learner limits cost.

## Testing Decisions

What makes a good test here

- Test external behavior only. A test asserts what a caller or a learner can observe,
  never which internal function ran or how a prompt was worded.
- Model and search providers are replaced with scripted fakes at their client
  boundary, so tests are fast, deterministic, and free.

Seams

- Backend. The public HTTP API, with the model client and the search client faked.
  Nearly every rule above can be exercised through it.
- Frontend. The lesson page rendered from a lesson response fixture, asserting what the
  learner sees and can do.
- Fixtures are **frontend-owned** and live at
  `src/features/lessons/fixtures/`, named `<kind>-<slug>.json` with odd cases
  suffixed. The shared artifact is `docs/lesson-schema.json`, not the fixtures: two
  valid examples of one schema cost nothing, two shared fixture sets cost a version
  bump each time the contract moves.

Behaviors to cover at the backend seam

- A lesson is not generated when the workspace has no active mission.
- A mission change without confirmation is rejected, and a confirmed change creates a
  learning record.
- A generated lesson that breaks a validation rule is rejected and regenerated, and one
  that passes is stored.
- A lesson citing a resource from another workspace is rejected.
- An attempt with evidence of understanding creates a learning record, and an attempt
  without it creates none.
- A contradicted record is marked superseded and still listed.
- A term enters the glossary only after the learner uses it correctly.
- Search result text that tells the model to change the mission leaves the mission
  unchanged.
- The lesson response never contains recall answers or rubrics, and the attempt result
  does.
- The daily lesson cap blocks the next request.
- Inline SVG containing script is rejected or stripped before a lesson is stored.

Behaviors to cover at the frontend seam

- A quiz shows feedback right after an answer.
- Hovering or focusing a glossary term shows its definition.
- A lesson with an unknown block type still renders the rest and logs the unknown
  block.
- A lesson with one malformed block still renders the others.
- Recall expected answers stay hidden until the learner submits.
- A waiting state shows while a lesson is being generated, and survives navigating away
  and back.

Prior art in this repository

- `src/features/auth` is the reference feature: token auth, Zod schemas, React Hook
  Form, Mantine, and colocated tests. Follow it.
- Authentication is already implemented with Sanctum personal access tokens and is
  kept as-is. Do not reopen it.

## Out of Scope

- Lessons written as arbitrary HTML, including a sandboxed HTML block. Deferred on
  purpose, because it weakens validation, theming, and grading.
- An interactive block backed by a catalog of vetted widgets such as ordering,
  matching, or timers. Deferred until real lessons show which widgets are worth
  building.
- Sharing a workspace between learners.
- Native mobile apps.
- Billing and plans.
- Hosting or moderating communities. The app only lists existing ones.
- Importing existing courses or documents as sources.
- Voice and video lessons.
- Offline lesson reading.

## Further Notes

- Domain vocabulary lives in [`GLOSSARY.md`](../GLOSSARY.md). The `Resource` to
  `Source` rename is **prose only**: the wire format keeps `resourceId` and the
  `resources` map.
- Open decisions that need an owner. The model provider, the spaced repetition
  algorithm, how long learner answers are kept, whether communities are curated or
  found per learner, the retry limit when regenerating a rejected lesson, which SVG
  sanitizer the backend uses, and when attempts are submitted.
- The lesson recipe matrix is a first guess. Tune it once real generated lessons exist.
- The backend is built by a separate developer, who reads this repository. Contract
  changes travel as commits to `docs/lesson-schema.json`.
