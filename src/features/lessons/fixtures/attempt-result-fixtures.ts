/**
 * What an attempt comes back as, exactly as the API sends it.
 *
 * These are the wire bodies, parsed by the feature's own schema before any test
 * sees them, so a stub hands the screen what the backend would send rather than
 * what the screen would like to receive. A fixture that stops parsing means the
 * contract moved and the mirror in `schemas/attempt-schema.ts` is wrong.
 *
 * Three facts are carried deliberately, because each is one the reader could
 * otherwise get wrong:
 *
 * - **A skipped answer has no entry.** `q3` and `rc2` are absent from
 *   `perAnswer` because they were never sent. A stub that returned a result for
 *   them would be a result for an answer the learner never gave, and the summary
 *   would then be counting something that does not exist.
 * - **No steps entries.** The contract says they never appear, so a fixture with
 *   one would be a fixture of a contract breach rather than an odd case.
 * - **`feedback` is where a recall's expected answer and rubric travel.** The
 *   lesson response strips both, and `perAnswer` has nowhere else to put them, so
 *   the backend writes them into these words and the reader labels them.
 */

/** The expected answer the backend holds for `rc1`, withheld until now. */
export const rc1ExpectedAnswer =
  'Because the 3 is added to the whole of 2x, so it has to come off before the 2 stops multiplying.'

/** The two points `rc1` is judged against, withheld until now. */
export const rc1Rubric = [
  'Says the 3 is added to the whole left side, not to the x alone',
  'Says the 2 multiplies whatever is left once the 3 has gone',
]

/**
 * The backend's words for a recall: the expected answer, then the rubric to compare
 * against. One string, because `perAnswer.feedback` is one string and inventing a
 * split the contract does not describe would be the reader parsing prose it was
 * never given a structure for.
 */
const rc1Feedback = [
  `A good answer says: ${rc1ExpectedAnswer}`,
  'Compare yours against two things:',
  ...rc1Rubric.map((line) => `- ${line}`),
].join(' ')

/**
 * Two of the three answered graded items right, one wrong, two never sent. The
 * checklist is fully ticked in the lesson these go with, so a reader that counted
 * steps would have a different denominator from this one.
 */
export const attemptResultResponse = {
  perAnswer: [
    {
      type: 'quiz',
      id: 'q1',
      correct: true,
      feedback:
        'Exactly that. The way back is the inverse of the move you have already made, so it is never a guess.',
    },
    {
      type: 'quiz',
      id: 'q2',
      correct: false,
      feedback:
        'Order is not about pace. In 2x + 3 = 11 the 2 multiplies the whole left side, so the 3 comes off first.',
    },
    {
      type: 'recall',
      id: 'rc1',
      correct: true,
      feedback: rc1Feedback,
    },
  ],
  recordCandidate: null,
  glossaryCandidates: [],
}

/**
 * The same answers, inside the Laravel `data` envelope this app also has to read,
 * with a learning record the backend decided on. The record is the backend's call:
 * the reader reports it and never draws a conclusion of its own.
 */
export const attemptResultWithRecordResponse = {
  data: {
    ...attemptResultResponse,
    recordCandidate: {
      title: 'Explains why the order of the two moves is fixed',
      body: 'Ada said it in her own words, unprompted, and named what the 2 multiplies rather than repeating the procedure back.',
      evidence:
        'rc1 asked for the reason the order is fixed, and the answer names the whole left side the 3 is added to.',
    },
  },
}

/**
 * The hands-on lesson's one recall, answered and graded. Paired with
 * `hands-on-setting-up-the-practice-set.json`: that lesson carries steps and a
 * recall and no quiz, so this result has exactly one graded answer and no steps
 * entry, which is what a lesson with a checklist and one prompt comes back as.
 */
export const handsOnAttemptResultResponse = {
  perAnswer: [
    {
      type: 'recall',
      id: 'rc1',
      correct: true,
      feedback:
        'A good answer says: A sentence has no symbols to get wrong, so the equation has nothing to be inconsistent with. Compare yours against two things: - Names the sentence as plain words - Says the equation only translates what the sentence already said',
    },
  ],
  recordCandidate: null,
  glossaryCandidates: [],
}

/**
 * The review lesson answered in full: both quiz questions and all three recall
 * prompts. A review mixes several recall prompts, so this is what proves the
 * reader gives every one of them its own feedback rather than the first one and
 * a summary.
 *
 * `rc2` comes back wrong on purpose. A review is for finding gaps, so a result
 * where everything is right is the one a learner learns nothing from.
 */
export const reviewAttemptResultResponse = {
  perAnswer: [
    {
      type: 'quiz',
      id: 'q1',
      correct: true,
      feedback: 'Exactly that. Take the 3 off first and the term x is left standing alone.',
    },
    {
      type: 'quiz',
      id: 'q2',
      correct: false,
      feedback:
        'Check that every step was reversible before you check the arithmetic. An irreversible step is where the equation quietly changed meaning.',
    },
    {
      type: 'recall',
      id: 'rc1',
      correct: true,
      feedback:
        'A good answer says: Because the 3 is added to the whole of 2x, so it has to come off before the 2 stops multiplying. Compare yours against two things: - Says the 3 is added to the whole left side - Says the 2 multiplies whatever is left',
    },
    {
      type: 'recall',
      id: 'rc2',
      correct: false,
      feedback:
        'A good answer says: Every step you can undo has an inverse: what you did can be done the other way round, on both sides. Yours did not name the inverse, so it is a gap worth one more pass through the first lesson.',
    },
    {
      type: 'recall',
      id: 'rc3',
      correct: true,
      feedback:
        'A good answer says: Put the answer back into both sides and see whether they still read the same. If they do not, the mistake is earlier than the last line you wrote.',
    },
  ],
  recordCandidate: null,
  glossaryCandidates: [],
}

/**
 * Every graded answer marked wrong, including one the learner actually got right.
 * The lesson it goes with is the same one, so the only way to tell the two apart is
 * that the reader takes the verdict from what came back rather than recomputing it
 * from the picks — which is what "the backend grades" means in practice.
 */
export const attemptResultAllWrongResponse = {
  perAnswer: [
    {
      type: 'quiz',
      id: 'q1',
      correct: false,
      feedback: 'Marked wrong on a re-read of the rubric, whatever the lesson says is correct.',
    },
  ],
  recordCandidate: null,
  glossaryCandidates: [],
}
