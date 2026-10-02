/**
 * Wire-shaped responses from `POST /api/test-teach`, exactly as the practice
 * route sends them: inside the Laravel `data` envelope, with the fields the
 * screen does not read (`structured.lesson`, `terms`, `resources`, `text`,
 * `validation_warnings`) left in so they are proven harmless.
 */

export const openingTurnResponse = {
  message: 'Teach turn completed.',
  data: {
    conversation_id: 'conv-1',
    reply:
      'Passing a placement test is a good, concrete reason. A few questions so the mission is specific.',
    phase: 'interviewing',
    questions: [
      {
        id: 'deadline',
        label: 'When is the placement test?',
        type: 'single',
        options: [
          { value: 'month', label: 'Within a month' },
          { value: 'term', label: 'This term' },
          { value: 'unsure', label: 'Not sure yet' },
        ],
        required: true,
      },
      {
        id: 'weak-spots',
        label: 'Which parts feel shakiest?',
        type: 'multi',
        options: [
          { value: 'equations', label: 'Solving equations' },
          { value: 'graphs', label: 'Reading graphs' },
        ],
        required: false,
      },
      {
        id: 'time',
        label: 'How much time can you give it each week?',
        type: 'open',
        options: [],
        required: true,
      },
    ],
    structured: {
      message: 'Passing a placement test is a good, concrete reason.',
      phase: 'interviewing',
      mission_draft: {
        topic: 'Algebra',
        why: 'Pass the placement test.',
        success: [],
        constraints: [],
        out_of_scope: [],
      },
      lesson: null,
    },
    lesson: null,
    terms: {},
    resources: {},
    text: '{"message": "..."}',
    parse_error: null,
    validation_warnings: [],
  },
}

export const completeTurnResponse = {
  message: 'Teach turn completed.',
  data: {
    conversation_id: 'conv-1',
    reply: 'This first lesson covers two-step equations, because the test leans on them.',
    phase: 'lesson',
    questions: [],
    structured: {
      message: 'This first lesson covers two-step equations.',
      phase: 'lesson',
      mission_draft: {
        topic: 'Algebra',
        why: 'Pass the placement test in June and help my brother with his homework.',
        success: ['Score 80% or better', 'Solve two-step equations without notes'],
        constraints: ['Two hours a week, weekdays only'],
        out_of_scope: ['Geometry'],
      },
      lesson: { kind: 'concept', title: 'Two-step equations' },
    },
    lesson: { schemaVersion: 1, title: 'Two-step equations' },
    terms: {},
    resources: { '1': { title: 'Source', url: 'https://example.com' } },
    text: '{"message": "..."}',
    parse_error: null,
    validation_warnings: [],
  },
}

/** The model answered in prose instead of JSON, so nothing structured came back. */
export const unparsedTurnResponse = {
  message: 'Teach turn completed.',
  data: {
    conversation_id: 'conv-1',
    structured: null,
    reply: 'What would passing the test let you do that you cannot do now?',
    phase: null,
    questions: null,
    lesson: null,
    terms: {},
    resources: {},
    text: 'What would passing the test let you do that you cannot do now?',
    parse_error: 'Response was not valid JSON: Syntax error',
    validation_warnings: [],
  },
}
