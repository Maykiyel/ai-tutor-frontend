# Lesson format

Prose description of the lesson format. **`docs/lesson-schema.json` is authoritative.**
This file explains why the rules are what they are; the schema defines what is valid.
If they disagree, the schema wins.

## The lesson response

Three top-level keys: `lesson`, `terms`, `resources`. The two maps are hydrated, so
the frontend never makes a second request for a term or a cited source.

```json
{
  "lesson": { "schemaVersion": 1, "number": 3, "kind": "concept", "blocks": [] },
  "terms": {
    "4": { "term": "query key", "definition": "The array that identifies a cached query." }
  },
  "resources": { "12": { "title": "Query invalidation guide", "url": "https://example.com/guide" } }
}
```

A lesson is a header plus an ordered `blocks` list. The `type` field decides each
block's shape, and `kind` is `concept`, `hands-on`, or `review`.

Ids like `q1`, `a`, and `rc1` are lesson-scoped. The learner sends them back when
answering.

## Blocks

Nine types, fixed. The model cannot invent a new one.

| Block       | Shape                   | Notes                                     |
| ----------- | ----------------------- | ----------------------------------------- |
| `callout`   | `tone`, `content`       | `tone` is `win`, `note`, or `watch-out`.  |
| `heading`   | `level`, `text`         | `level` is 2 or 3.                        |
| `paragraph` | `content`               | Segments.                                 |
| `code`      | `language`, `code`      | Inert text. Never evaluated.              |
| `figure`    | `kind`, `source`, `alt` | `kind` is `svg`, `mermaid`, or `image`.   |
| `table`     | `headers`, `rows`       | Row length must match header length.      |
| `steps`     | `title`, `items`        | Items have `id`, `instruction`, `check`.  |
| `quiz`      | `questions`             | Ships with answers, for instant feedback. |
| `recall`    | `id`, `prompt`          | Answers withheld until submission.        |

### Segments

Paragraph and callout content is a list of segments: `text`, inline `code`, `term`,
`cite`, or `link`. Inline code carries no language field; a language hint on a
one-word span has no use.

A `term` segment points at a term already in the workspace glossary. A term the
learner has not demonstrated yet appears as plain `text` and becomes a glossary
candidate only after they use it correctly.

## Recipe matrix

The topic picker returns a skill and a `kind`. Each kind has a recipe, which goes into
the lesson writer prompt and the structured output format, and which the validator
enforces.

| Block     | concept     | hands-on | review      |
| --------- | ----------- | -------- | ----------- |
| callout   | required    | required | allowed     |
| heading   | allowed     | allowed  | allowed     |
| paragraph | required    | required | not allowed |
| code      | allowed     | allowed  | not allowed |
| figure    | allowed     | allowed  | not allowed |
| table     | allowed     | allowed  | not allowed |
| steps     | not allowed | required | not allowed |
| quiz      | required    | allowed  | required    |
| recall    | required    | required | required    |

**This matrix is a first guess.** Tune it once real generated lessons exist.

## Validation rules

The backend rejects a lesson that breaks any of these and asks the model to regenerate.

- `minutes` is at most 15.
- At least one `quiz`, `recall`, or `steps` block. There is no such thing as a
  "practice block" — the rule names the three block types.
- Blocks follow the recipe for the lesson's `kind`.
- Each quiz question has 3 or 4 options, every option has the same word count, and
  `correctOptionId` matches one of them.
- At least one `cite` segment appears, and every `cite.resourceId` exists in the same
  workspace.
- Every `term.termId` exists in the same workspace's glossary.
- `primarySource.resourceId` exists in the same workspace. This is the only source of
  truth; there is no `primary_source_url` column on the lessons table.

Word-count equality and the database-existence checks need custom rules beyond plain
Laravel validation.

## What stays on the server

- **Quiz answers and explanations ship in the lesson JSON.** That is what makes
  feedback instant. A learner who peeks only cheats themselves.
- **`recall` blocks are stored with `modelAnswer` and `rubric`, but the lesson
  response strips both.** They return in the attempt result after the learner
  submits.

## Rendering

The frontend keeps one registry from block `type` to a React component. `type` is the
only link between backend and UI; every other field is a prop.

Three rules for the renderer:

- An unknown `type` renders nothing and is logged. It must not crash the page.
- Blocks parse one at a time. A single malformed block is skipped and the rest still
  render. Never reject a whole lesson over one bad block.
- `schemaVersion` is a warning, not a wall. Render what validates, skip what does
  not, and show a banner that the lesson is newer than the app. See
  `docs/adr/0002-lesson-schema-versioning.md`.

The JSON carries meaning only: no colours, sizes, or spacing. A redesign restyles
every stored lesson.

## Adding a block later

The frontend registry is `src/features/lessons/blocks/registry.ts`, one map from
`type` to a schema and a component. Adding a type is a component plus one registry
entry; there is no switch elsewhere to extend.

The full checklist lives next to the registry, in
`src/features/lessons/blocks/README.md`, and covers both sides of the contract.
In short: add the block to `docs/lesson-schema.json` and the lesson writer prompt,
add the Zod schema and the component in the frontend, add one registry entry, add
a fixture, update the recipe matrix above, and bump `schemaVersion` only if old
lessons would break. Coordinate through the schema file rather than through prose.
