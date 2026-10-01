# Glossary

The vocabulary of the AI tutor. Both onboarding documents link here rather than
restating terms, so that this file is the single definition and the documents stay
short.

Where a term has aliases we do not use, they are listed under **Avoid**. That mirrors
the product rule in `docs/backend-onboarding.md`: the product itself keeps one
preferred word per concept and records the alternatives it will not use.

- [Block](#block)
- [Glossary term](#glossary-term)
- [Learning record](#learning-record)
- [Lesson](#lesson)
- [Mission](#mission)
- [Recall](#recall)
- [Reference doc](#reference-doc)
- [Source](#source)
- [Workspace](#workspace)
- [Zone of proximal development](#zone-of-proximal-development)

## Block

A piece of a lesson: a paragraph, a code sample, a quiz, a figure. Lessons are
structured JSON built from a fixed list of nine block types, and the model cannot
invent a new one.

A block carries meaning only, never styling. There is no colour, size, or spacing in
the JSON, so a redesign restyles every stored lesson.

Avoid: section, component, widget, element.

## Glossary term

A term the learner can use correctly. Terms are promoted into the glossary only after
the learner demonstrates that use, ideally by writing the definition themselves.

Inside a lesson, a glossary term renders as a hover or focus card showing its
definition, so the learner does not lose their place.

Each term has one preferred word and a list of aliases to avoid, so wording stays
consistent across lessons.

## Learning record

A short note recording something the learner actually showed: non-trivial
understanding, disclosed prior knowledge, a misconception corrected, or a mission
change.

A learning record is not an activity log and not a session history. Material that was
merely covered does not qualify. Records need evidence, such as a quiz answer or a
recall response, and contradicted records are marked superseded rather than deleted.

## Lesson

One short unit of study: one skill, one win, at most 15 minutes. Stored as JSON and
rendered by React.

Lessons come in three kinds. A **concept** lesson explains something. A **hands-on**
lesson walks the learner through real-world steps. A **review** lesson asks the learner
to recall earlier material and introduces no new explanation.

## Mission

Why the learner wants to learn this topic, stated concretely. A mission holds a goal,
success criteria, constraints, and out-of-scope topics.

A mission steers every other decision in the workspace. It is created through an
interview, revised as a set of revisions with exactly one active per workspace, and
every change needs explicit learner confirmation.

## Recall

A practice block that asks the learner to write an answer from memory, rather than
recognise one among options.

Recall builds long-term retention better than multiple choice does. The expected
answer and its rubric are stored with the lesson but withheld from the lesson response
until the learner submits an attempt.

Avoid: short answer, free text, open question.

## Reference doc

A compressed cheat sheet distilled from a learner's own lessons: reference tables,
step lists, routines. Built for lookup rather than for reading, and it prints cleanly
so the learner can keep a copy offline.

Reference docs use the same blocks as lessons, without the practice blocks.

## Source

A trusted source with a one-line note on what it covers and when to use it. Kinds are
**knowledge** and **wisdom**; wisdom sources are communities.

Every source needs its annotation. Only high-trust material is accepted, and weak
sources are pruned rather than deleted, because stored lessons still cite them.

Avoid: resource, link, reference, citation. See the note below.

### On the rename from Resource to Source

The product originally called this a **resource**. Both onboarding documents did too,
and the wire format still does: `resourceId`, `primarySource.resourceId`, and the
hydrated `resources` map are unchanged in `docs/lesson-schema.json`.

The rename is deliberate and limited to vocabulary. `Resource` collides badly in a
React codebase, where `src/assets/` holds static files and "resource" is the first
thing a developer hears. Renaming the JSON fields would force a coordinated change
across two repositories for a wording problem, so the wire format stays at version 1.

Note the one asymmetry: `docs/backend-onboarding.md` still uses `resource` when
describing the database tables, because the tables are named that on the wire.

## Workspace

One learner, one topic, one mission. Every screen except the workspace list lives
inside a workspace.

A learner with two unrelated goals has two workspaces. All authorization runs through
workspace ownership rather than per table, and the workspace carries the learner's
teaching notes and their community opt-out.

## Zone of proximal development

The next thing that stretches a learner without stalling them. The topic picker
derives it from the learner's mission, learning records, and glossary, and aims each
lesson just past what they have already shown they understand.

Avoid: difficulty level, appropriate level, skill level.
