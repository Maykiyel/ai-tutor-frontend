/**
 * Wire-shaped responses from `POST /api/test-teach`, exactly as the practice
 * route sends them: inside the Laravel `data` envelope, with the fields the
 * screen does not read (`structured.lesson`, `terms`, `resources`, `text`,
 * `validation_warnings`, `workspace_id`) left in so they are proven harmless.
 *
 * A lesson turn saves the mission and, when it passes the backend's checks,
 * the lesson; `mission_id` and `lesson_id` name the saved rows or are null.
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
    workspace_id: null,
    mission_id: null,
    lesson_id: null,
  },
}

/** The mission was saved; the lesson was too thin to pass, so it stayed a preview. */
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
    validation_warnings: ['Lesson is missing required key: blocks.'],
    workspace_id: 7,
    mission_id: 12,
    lesson_id: null,
  },
}

/** A lesson turn whose draft had no reason to learn, so the backend saved no mission. */
export const unsavedCompleteTurnResponse = {
  message: 'Teach turn completed.',
  data: {
    ...completeTurnResponse.data,
    structured: {
      ...completeTurnResponse.data.structured,
      mission_draft: { ...completeTurnResponse.data.structured.mission_draft, why: null },
    },
    mission_id: null,
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

/**
 * What the observed failure looked like on the wire: the model returned valid
 * JSON with one extra trailing `}`, the backend could not parse it, and `reply`
 * carries the raw text. The screen must not print this.
 */
export const rawJsonTurnResponse = {
  message: 'Teach turn completed.',
  data: {
    conversation_id: 'conv-1',
    structured: null,
    reply:
      '{"message": "Two-step equations first.", "phase": "interviewing", ' +
      '"questions": [], "mission_draft": {"topic": "Algebra"}}}}',
    phase: null,
    questions: null,
    lesson: null,
    terms: {},
    resources: {},
    text: '{"message": "Two-step equations first."}}}',
    parse_error: 'Response was not valid JSON: Syntax error',
    validation_warnings: [],
  },
}

/**
 * A completed turn carrying a full lesson the backend saved, in the frontend's
 * contract shape: header, blocks, hydrated resources keyed by the real source
 * id, and no recall secrets.
 */
export const completeTurnWithLessonResponse = {
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
    lesson: {
      schemaVersion: 1,
      number: 1,
      kind: 'concept',
      slug: 'two-step-equations',
      title: 'Two-step equations',
      skill: 'Solve an equation that needs two operations.',
      missionLink: 'Almost every problem in the practice set needs this one move.',
      minutes: 8,
      primarySource: {
        resourceId: 4,
        why: 'It works one equation at a time, which is the pace you read at.',
      },
      blocks: [
        { type: 'heading', level: 2, text: 'One operation, both sides' },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'An equation is a claim that two things are equal. Every operation on one side has to happen to the other.',
            },
          ],
        },
        {
          type: 'quiz',
          questions: [
            {
              id: 'q1',
              prompt: 'Which move comes first?',
              options: [
                { id: 'a', text: 'Add four to both sides', feedback: 'That is the second move.' },
                {
                  id: 'b',
                  text: 'Subtract three from both sides',
                  feedback: 'Exactly that.',
                },
                { id: 'c', text: 'Divide both sides by two', feedback: 'You cannot divide yet.' },
              ],
              correctOptionId: 'b',
              explanation: 'Undo addition before multiplication.',
            },
          ],
        },
      ],
    },
    terms: {},
    resources: {
      '4': { title: 'Two-step equations, worked slowly', url: 'https://example.org/two-step' },
    },
    text: '{"message": "..."}',
    parse_error: null,
    validation_warnings: [],
    workspace_id: 7,
    mission_id: 12,
    lesson_id: 31,
  },
}
