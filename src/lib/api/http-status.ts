import axios from 'axios'

/**
 * The HTTP status a failed request came back with, or `undefined` when there was
 * no response at all (the network dropped, the server never answered) or the
 * error did not come from a request.
 *
 * Screens that react differently to different refusals read the status through
 * this rather than reaching into an Axios error themselves, so "what does a 409
 * mean here" stays a question about the status and not about the HTTP library.
 */
export function getHttpStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined
}
