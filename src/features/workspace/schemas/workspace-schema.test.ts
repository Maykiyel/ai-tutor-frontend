import { describe, expect, it } from 'vitest'

import { workspaceListResponseSchema, workspaceResponseSchema } from './workspace-schema'

describe('workspace schemas', () => {
  it('turns a numeric id into the string the path needs', () => {
    expect(workspaceResponseSchema.parse({ data: { id: 42, topic: 'Algebra' } })).toEqual({
      id: '42',
      topic: 'Algebra',
    })
  })

  it('drops fields it does not describe rather than failing', () => {
    const parsed = workspaceListResponseSchema.parse({
      data: [{ id: 42, topic: 'Algebra', notes: 'slow and steady', lesson_count: 3 }],
    })

    expect(parsed).toEqual([{ id: '42', topic: 'Algebra' }])
  })

  it('reads a body that is not wrapped in a data envelope', () => {
    expect(workspaceListResponseSchema.parse([{ id: '42', topic: 'Algebra' }])).toEqual([
      { id: '42', topic: 'Algebra' },
    ])
  })

  it('refuses a workspace with no topic', () => {
    expect(() => workspaceResponseSchema.parse({ data: { id: 42 } })).toThrow()
  })
})
