import { describe, expect, it } from 'vitest'

import { lessonListResponseSchema, newestLessonNumber } from './lesson-list-schema'

describe('lesson list response schema', () => {
  it('reads a list out of the Laravel data envelope', () => {
    expect(
      lessonListResponseSchema.parse({
        data: [{ id: 12, number: 3, kind: 'concept', title: 'Two-step equations', minutes: 8 }],
      }),
    ).toEqual([{ id: '12', number: 3, kind: 'concept', title: 'Two-step equations', minutes: 8 }])
  })

  it('reads a bare array body, which is what a plain controller would send', () => {
    expect(
      lessonListResponseSchema.parse([
        { id: '12', number: 3, kind: 'review', title: 'Two-step equations', minutes: 8 },
      ]),
    ).toHaveLength(1)
  })

  it('drops fields it does not describe rather than failing the list', () => {
    const parsed = lessonListResponseSchema.parse({
      data: [
        {
          id: 12,
          number: 3,
          kind: 'concept',
          title: 'Two-step equations',
          minutes: 8,
          generated_at: '2026-09-28T09:14:00Z',
          schema_version: 1,
        },
      ],
    })

    expect(parsed[0]).not.toHaveProperty('generated_at')
    expect(parsed[0]).toHaveProperty('title', 'Two-step equations')
  })

  it('reads an empty list as an empty list, not a failure', () => {
    expect(lessonListResponseSchema.parse({ data: [] })).toEqual([])
  })
})

describe('newestLessonNumber', () => {
  it('reads no lessons as zero, so a first lesson is newer than nothing', () => {
    expect(newestLessonNumber([])).toBe(0)
  })

  it('takes the highest number whatever order the list arrives in', () => {
    const lessons = [
      { id: '13', number: 4, kind: 'hands-on' as const, title: 'B', minutes: 12 },
      { id: '12', number: 3, kind: 'concept' as const, title: 'A', minutes: 8 },
    ]

    expect(newestLessonNumber(lessons)).toBe(4)
    expect(newestLessonNumber([...lessons].reverse())).toBe(4)
  })
})
