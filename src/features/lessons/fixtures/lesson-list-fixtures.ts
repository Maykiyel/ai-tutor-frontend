/**
 * Wire-shaped list response: inside the Laravel `data` envelope, ids as numbers
 * because the column is a bigint.
 *
 * `generated_at` is in no schema of ours. It stands in for anything the backend
 * adds later, which must not fail the parse.
 */
export const lessonListResponse = {
  data: [
    {
      id: 12,
      number: 3,
      kind: 'concept',
      title: 'Solving two-step equations',
      minutes: 8,
      generated_at: '2026-09-28T09:14:00Z',
    },
    {
      id: 13,
      number: 4,
      kind: 'hands-on',
      title: 'Setting up the practice set',
      minutes: 12,
      generated_at: '2026-09-29T09:14:00Z',
    },
  ],
}

export const emptyLessonListResponse = {
  data: [],
}
