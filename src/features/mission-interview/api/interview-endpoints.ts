/**
 * The interview talks to the backend's local-only practice route for now. The
 * agreed endpoint is `POST /api/workspaces/{id}/mission-interview/messages`
 * (`docs/spec.md`), which is not built; when it is, this is the line that
 * changes, along with the request body in `interview-api.ts`.
 *
 * `/api/test-teach` is registered only when the backend runs in its local
 * environment, so outside it every turn fails and the screen says so.
 */
export const interviewEndpoints = {
  messages: '/api/test-teach',
} as const
