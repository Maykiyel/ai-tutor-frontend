/**
 * Wire-shaped responses, exactly as the API would send them: inside the
 * Laravel `data` envelope, ids as numbers because the column is a bigint, and
 * carrying the fields the data model names.
 *
 * `lesson_count` and `latest_lesson_at` are in no schema of ours. They stand
 * in for anything the backend adds later, which must not fail the parse.
 */
export const workspacesResponse = {
  data: [
    {
      id: 7,
      topic: 'Algebra',
      notes: 'Start from what I already know.',
      communities_opt_out: false,
      lesson_count: 3,
    },
    {
      id: 9,
      topic: 'Kanji',
      notes: null,
      communities_opt_out: true,
      lesson_count: 0,
    },
  ],
}

export const emptyWorkspacesResponse = {
  data: [],
}

export const workspaceResponse = {
  data: {
    id: 7,
    topic: 'Algebra',
    notes: 'Start from what I already know.',
    communities_opt_out: false,
  },
}
