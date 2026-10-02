import { describe, expect, it } from 'vitest'

import {
  completeTurnResponse,
  completeTurnWithLessonResponse,
  openingTurnResponse,
  rawJsonTurnResponse,
  unparsedTurnResponse,
} from '../fixtures/interview-fixtures'
import { interviewTurnResponseSchema } from './interview-schema'

describe('interview turn schema', () => {
  it('reads an interviewing turn with its questions and the mission so far', () => {
    const turn = interviewTurnResponseSchema.parse(openingTurnResponse)

    expect(turn.conversationId).toBe('conv-1')
    expect(turn.status).toBe('interviewing')
    expect(turn.questions.map((question) => [question.id, question.type])).toEqual([
      ['deadline', 'single'],
      ['weak-spots', 'multi'],
      ['time', 'open'],
    ])
    expect(turn.missionDraft?.why).toBe('Pass the placement test.')
  })

  it('reads the lesson phase as the end of the interview and keeps only the mission', () => {
    const turn = interviewTurnResponseSchema.parse(completeTurnResponse)

    expect(turn.status).toBe('complete')
    expect(turn.missionDraft).toEqual({
      why: 'Pass the placement test in June and help my brother with his homework.',
      success: ['Score 80% or better', 'Solve two-step equations without notes'],
      constraints: ['Two hours a week, weekdays only'],
      outOfScope: ['Geometry'],
    })
    expect(turn.parseError).toBeNull()
    expect(turn.missionId).toBe('12')
    expect(turn.lessonData?.lessonId).toBeNull()
  })

  it('reads a turn from before the backend saved anything as nothing saved', () => {
    const { mission_id: _mission, lesson_id: _lesson, ...older } = completeTurnResponse.data
    const turn = interviewTurnResponseSchema.parse({ data: older })

    expect(turn.missionId).toBeNull()
    expect(turn.lessonData?.lessonId).toBeNull()
  })

  it('carries a full lesson turn through unparsed for the preview', () => {
    const turn = interviewTurnResponseSchema.parse(completeTurnWithLessonResponse)

    expect(turn.status).toBe('complete')
    expect(turn.lessonData).toMatchObject({
      terms: {},
      resources: { '4': { title: 'Two-step equations, worked slowly' } },
      lessonId: '31',
    })
    expect((turn.lessonData?.lesson as { title?: unknown })?.title).toBe('Two-step equations')
  })

  it('marks a turn the backend could not parse instead of passing the raw JSON through', () => {
    const turn = interviewTurnResponseSchema.parse(rawJsonTurnResponse)

    expect(turn.status).toBe('interviewing')
    expect(turn.parseError).toMatch(/not valid JSON/i)
    expect(turn.lessonData).toBeNull()
    expect(turn.missionDraft).toBeNull()
  })

  it('keeps a turn the model wrote in prose, with no questions and no draft', () => {
    const turn = interviewTurnResponseSchema.parse(unparsedTurnResponse)

    expect(turn.status).toBe('interviewing')
    expect(turn.message).toMatch(/what would passing the test/i)
    expect(turn.questions).toEqual([])
    expect(turn.missionDraft).toBeNull()
  })

  it('drops a malformed question and a repeated id instead of failing the turn', () => {
    const turn = interviewTurnResponseSchema.parse({
      data: {
        conversation_id: 'conv-1',
        reply: 'Two questions.',
        phase: 'interviewing',
        questions: [
          { id: 'a', label: 'First?', type: 'open', options: [], required: true },
          { id: 'a', label: 'Same id?', type: 'open', options: [], required: true },
          { label: 'No id?' },
          'not a question',
        ],
        structured: null,
      },
    })

    expect(turn.questions.map((question) => question.label)).toEqual(['First?'])
  })

  it('turns a choice question with no usable options into an open one', () => {
    const turn = interviewTurnResponseSchema.parse({
      data: {
        conversation_id: 'conv-1',
        reply: 'One question.',
        phase: 'interviewing',
        questions: [{ id: 'a', label: 'Pick?', type: 'single', options: [{ label: 'no value' }] }],
        structured: null,
      },
    })

    expect(turn.questions[0]).toMatchObject({ type: 'open', options: [], required: false })
  })

  it('refuses a turn with no conversation to continue', () => {
    expect(() =>
      interviewTurnResponseSchema.parse({ data: { reply: 'Hello.', phase: 'interviewing' } }),
    ).toThrow()
  })
})
