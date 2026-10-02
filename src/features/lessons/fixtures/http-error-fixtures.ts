import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios'

/**
 * The refusals the backend sends for the lesson endpoints, as the errors the
 * shared Axios client rejects with.
 *
 * The bodies are the backend's own wire shapes: `{ message, code }` for every
 * refusal that is not a validation failure, and Laravel's `{ message, errors }`
 * for a 422. A stub rejects with one of these so the screen classifies a real
 * error the way it will in production, by its status, rather than being handed a
 * flag that says which case it is in.
 */
function httpError(status: number, statusText: string, data: unknown): AxiosError {
  const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig

  return new AxiosError(
    `Request failed with status code ${status}`,
    AxiosError.ERR_BAD_RESPONSE,
    config,
    undefined,
    { status, statusText, data, headers: {}, config },
  )
}

/** `POST /api/workspaces/{id}/lessons/next` on a workspace with no active mission. */
export const noActiveMissionError = () =>
  httpError(409, 'Conflict', {
    message: 'This workspace has no active mission, so no lesson can be written yet.',
    code: 'CONFLICT',
  })

/** `POST /api/lessons/{id}/attempts` when the recall grader failed. Nothing was stored. */
export const gradingUnavailableError = () =>
  httpError(503, 'Service Unavailable', {
    message: 'The grader is unavailable. Submit the same answers again.',
    code: 'SERVICE_UNAVAILABLE',
  })

/**
 * `POST /api/lessons/{id}/attempts` when an answer names something the lesson
 * does not have. The request was the app's mistake, so nothing was graded.
 */
export const attemptRejectedError = () =>
  httpError(422, 'Unprocessable Content', {
    message: 'The answers.0 field is invalid.',
    errors: { 'answers.0': ['This lesson has no question q9.'] },
  })
