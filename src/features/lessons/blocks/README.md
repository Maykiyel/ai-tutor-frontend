# Adding a lesson block type

`registry.ts` maps a block `type` to the schema that validates it and the component
that renders it. `type` is the only link between the backend and the UI, so a new
block type is a component, a schema, and one registry entry. There is no switch
anywhere else to extend, which is what keeps the reader's tolerance for unknown
types working as the format grows.

## Frontend

1. **Add the schema** to `../schemas/lesson-schema.ts`, mirroring the new
   `$defs` entry in `docs/lesson-schema.json`. Mirror it exactly: same required
   fields, same enums, same patterns. That file is authoritative.
2. **Add the component** to `./components/<name>-block.tsx`. It takes
   `{ block }` and nothing else. If it needs the hydrated maps or the lesson, take
   them from `LessonContext` rather than changing the props every block receives.
3. **Register it** — one entry in `blockRegistry` in `registry.ts`. Add the parsed
   block to the `LessonBlock` union in `../schemas/lesson-schema.ts` as well; if
   the type is new to the contract, add it to `lessonBlockTypeSchema` too. Both
   unions are what make `ParsedLessonBlock` distribute, so a type left out of one
   of them will not typecheck at the render site.
4. **Add a fixture** in `../fixtures`, named `<kind>-<slug>.json`, holding at
   least one block of the new type. A block type with no fixture is a block type
   that has never been rendered.
5. **Test it at the screen seam**, in `../components/lesson-reader.test.tsx`: stub
   `getLesson` with the fixture and assert what the learner can see, read, or do.
   Never assert which component ran or which registry key was hit.

## Backend

These are not frontend work, and the coordinate is the schema file rather than a
conversation:

1. Add the block to `docs/lesson-schema.json`, in its own commit. A change that is
   not in the schema file has not happened.
2. Add the block to the lesson writer prompt and the structured output format.
3. Update the recipe matrix in `docs/lesson-format.md`.
4. Validate against the schema before saving.
5. Bump `schemaVersion` **only** if old stored lessons would break under the new
   renderer. A new block type that old readers already skip is not a break, so it
   does not warrant a bump. See ADR-0002.

## Invariants a new block must not break

- Lesson JSON carries meaning only. No colour, size, or spacing is read from the
  payload; every visual decision comes from a shared component and a theme token,
  so a redesign restyles every stored lesson.
- Nothing in a block is ever evaluated. `code` is inert text; `figure` markup goes
  through DOMPurify; mermaid runs in strict mode. See ADR-0001.
- Nothing is signalled by colour alone. Tone, correctness, and state also read as
  words and as shape.
- A block that fails to validate is skipped and counted, and the learner is told
  something was skipped. It must never be able to fail the whole lesson.
