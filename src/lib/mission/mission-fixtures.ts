/**
 * Wire-shaped mission responses, exactly as the API would send them: inside the
 * Laravel `data` envelope, ids as numbers because the column is a bigint.
 *
 * `success_criteria`, `constraints`, `out_of_scope`, `revision` and
 * `superseded_by` are in no schema of ours. They stand in for the mission fields
 * the data model names and for anything the backend adds later, which must not
 * fail the parse.
 */
export const missionResponse = {
  data: {
    id: 3,
    why: 'Pass the placement test in June and be able to help my brother with his homework.',
    success_criteria: ['Score 80% or better', 'Explain linear equations without notes'],
    constraints: ['Two hours a week, weekdays only'],
    out_of_scope: ['Geometry'],
    is_active: true,
    superseded_by: null,
    revision: 2,
  },
}

export const noMissionResponse = {
  data: null,
}

export const supersededMissionResponse = {
  data: {
    id: 2,
    why: 'Finish the whole textbook, which turned out not to be the goal.',
    is_active: false,
    superseded_by: 3,
  },
}
