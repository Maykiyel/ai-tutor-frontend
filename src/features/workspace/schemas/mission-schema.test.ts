import { describe, expect, it } from 'vitest'

import { missionResponseSchema } from './mission-schema'

describe('mission schema', () => {
  it('reads the active mission out of the data envelope', () => {
    expect(
      missionResponseSchema.parse({
        data: { id: 3, why: 'Pass the placement test in June.', is_active: true },
      }),
    ).toEqual({ id: '3', why: 'Pass the placement test in June.', is_active: true })
  })

  it('reads a body that is not wrapped in a data envelope', () => {
    expect(
      missionResponseSchema.parse({
        id: 3,
        why: 'Pass the placement test in June.',
        is_active: true,
      }),
    ).toEqual({ id: '3', why: 'Pass the placement test in June.', is_active: true })
  })

  it('drops mission fields it does not describe rather than failing', () => {
    const parsed = missionResponseSchema.parse({
      data: {
        id: 3,
        why: 'Pass the placement test in June.',
        success_criteria: ['Score 80% or better'],
        constraints: ['Two hours a week'],
        out_of_scope: ['Geometry'],
        is_active: true,
        superseded_by: null,
        revision: 4,
      },
    })

    expect(parsed).toEqual({ id: '3', why: 'Pass the placement test in June.', is_active: true })
  })

  it('reads a workspace that has no mission as nothing rather than a failure', () => {
    expect(missionResponseSchema.parse({ data: null })).toBeNull()
    expect(missionResponseSchema.parse(null)).toBeNull()
  })

  it('keeps a revision that is not the active one distinguishable from the active one', () => {
    expect(
      missionResponseSchema.parse({
        data: { id: 2, why: 'A superseded attempt at the goal.', is_active: false },
      }),
    ).toEqual({ id: '2', why: 'A superseded attempt at the goal.', is_active: false })
  })

  it('refuses a mission with no why', () => {
    expect(() => missionResponseSchema.parse({ data: { id: 3, is_active: true } })).toThrow()
  })
})
