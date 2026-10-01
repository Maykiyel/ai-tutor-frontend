# ADR-0002: Lesson schema versioning

Status: accepted

Date: 2026-10-01

## Context

Lessons are stored as JSON and rendered later. The `schemaVersion` field tells the
frontend when a lesson is newer than it understands, and the documentation said only
that this should be detected, without saying what the renderer does about it.

The existing guidance covered an unknown _block type_ — render nothing, log it, do not
crash — but not an unknown _version_. Those are different problems. A new block type
in a known version is a partial gap: one block is skipped and the rest renders. A
version bump is a statement that some existing block may have changed shape, so
parsing the whole lesson strictly would reject blocks the backend considers valid.

The frontend is also built first, against fixtures, with no backend to negotiate a
breaking change with in real time.

## Decision

**`schemaVersion` is a warning, not a wall. Render what validates, skip what does not.**

- The lesson response parses **per block**, never all-or-nothing. A block that fails
  validation is skipped and logged; the surrounding lesson still renders.
- A `schemaVersion` higher than the app understands renders a banner telling the
  learner the lesson is newer than the app, alongside whatever blocks parsed cleanly.
- A `schemaVersion` higher than the app understands is not a hard-refuse. Hard-refusing
  would hide a lesson the learner is entitled to read, and would convert a rendering
  gap into a dead end.
- Bump `schemaVersion` only when old stored lessons would actually break under the new
  renderer. Additive changes — a new optional field, a new block type that old
  renderers already skip — do not warrant a bump.

## Consequences

- The per-block parse rule already required for malformed blocks extends to versions
  for free, which is why the two are stated together.
- Partial rendering is a real outcome. A lesson can render with visible gaps, and the
  learner should be able to tell that something is missing rather than wondering
  whether the lesson is simply short.
- The renderer needs a tolerant outer frame and a strict inner parse. That shape is a
  deliberate cost of forward compatibility.
- Adding a block type is a non-breaking change. Changing an existing block's required
  fields is breaking and needs a bump plus a migration story for stored rows.

## Related

- `docs/lesson-schema.json`, `lesson.schemaVersion`
- `docs/lesson-format.md`, Rendering
- `docs/lesson-format.md`, Adding a block later
