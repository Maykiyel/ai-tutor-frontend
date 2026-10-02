import { describe, expect, it } from 'vitest'

import { openingTurnResponse } from '../fixtures/interview-fixtures'
import { interviewTurnResponseSchema } from '../schemas/interview-schema'
import { describeAnswers, toPrompt } from './answers-to-prompt'

const { questions } = interviewTurnResponseSchema.parse(openingTurnResponse)

describe('describeAnswers', () => {
  it('says choices by their labels, adds written answers after them, and names a skip', () => {
    const answered = describeAnswers(questions, {
      deadline: { choices: ['term'], text: '', skipped: false },
      'weak-spots': { choices: [], text: '', skipped: true },
      time: { choices: [], text: '  Two hours, weekdays  ', skipped: false },
    })

    expect(answered).toEqual([
      { question: 'When is the placement test?', answer: 'This term' },
      { question: 'Which parts feel shakiest?', answer: 'Skipped.' },
      { question: 'How much time can you give it each week?', answer: 'Two hours, weekdays' },
    ])
  })

  it('joins several choices and a written answer on a multiple question', () => {
    const answered = describeAnswers(questions, {
      'weak-spots': { choices: ['graphs', 'equations'], text: 'Word problems', skipped: false },
    })

    expect(answered[1].answer).toBe('Reading graphs; Solving equations; Word problems')
  })

  it('says an optional question left blank was not answered', () => {
    const answered = describeAnswers(questions, {
      'weak-spots': { choices: [], text: ' ', skipped: false },
    })

    expect(answered[1].answer).toBe('No answer.')
  })
})

describe('toPrompt', () => {
  it('writes each question above its answer, one pair to a paragraph', () => {
    expect(
      toPrompt([
        { question: 'When?', answer: 'June' },
        { question: 'Why?', answer: 'The test' },
      ]),
    ).toBe('When?\nJune\n\nWhy?\nThe test')
  })
})
