import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'

import {
  findLesson,
  findMission,
  findWorkspace,
  listLessons,
  listWorkspaces,
  queueNextLesson,
} from './data.ts'

/**
 * A stand-in backend for walking the app in a browser, served by the Vite dev
 * server itself.
 *
 * It is deliberately not a mocking library in the app's test suite, and it does not
 * touch `src/`. Two reasons:
 *
 * - The repo has one test seam, agreed in `AGENTS.md`: a feature's own API module
 * - stubbed by a fixture. Adding a second mechanism for tests would be the thing
 * - that erodes that agreement.
 * - This is scaffolding for a human, not a test. It should be impossible for it to
 * - reach a production bundle, and the cheapest way to make that true by
 * - construction is to never be part of the app's module graph at all.
 *
 * So it lives in the dev server's middleware, on the same origin as the app, which
 * also means no CORS setup and no second port to remember. `configureServer` only
 * runs under `vite dev`, so the production build never sees any of this.
 *
 * It answers the seven endpoints the app actually calls, and serves the real test
 * fixtures as the lesson payloads, so the app's own Zod schemas and its Laravel
 * `data`-envelope handling are exercised for real. What it deliberately does *not*
 * do is check the bearer token: the point is to walk the UI, and a mock that
 * rejected requests would just be a second thing to log into.
 */

const GENERATION_DELAY_MS = 7_000

type MockResponse = { status: number; body: unknown }

type RouteHandler = (params: Record<string, string>, body: string) => MockResponse

type Route = {
  method: string
  pattern: string
  handle: RouteHandler
}

const envelope = (data: unknown): MockResponse => ({ status: 200, body: { message: 'OK', data } })

/**
 * Laravel API resources wrap a payload in `data`, and the auth responses carry a
 * `message` alongside it. The app's schemas accept either shape, so the mock sends
 * the wrapped one — the more likely divergence from the real thing, and therefore
 * the more useful one to walk against.
 */
const routes: Route[] = [
  {
    method: 'POST',
    pattern: '/api/login',
    handle: (_params, body) => {
      const { username, email } = readCredentials(body)

      return envelope({ user: { username, email }, token: 'mock-token', role: 'student' })
    },
  },
  {
    method: 'POST',
    pattern: '/api/register',
    handle: (_params, body) => {
      const { username, email } = readCredentials(body)

      return envelope({ username, email })
    },
  },
  { method: 'POST', pattern: '/api/logout', handle: () => envelope(null) },
  { method: 'GET', pattern: '/api/workspaces', handle: () => envelope(listWorkspaces()) },
  {
    method: 'GET',
    pattern: '/api/workspaces/:workspaceId',
    handle: (params) => workspaceOr404(params.workspaceId),
  },
  {
    method: 'GET',
    pattern: '/api/workspaces/:workspaceId/mission',
    handle: (params) => {
      const mission = findMission(params.workspaceId)

      // A workspace with no mission is an ordinary state, not a failure, so the
      // screen can explain the gate instead of showing an error.
      return { status: 200, body: { message: 'OK', data: mission ?? null } }
    },
  },
  {
    method: 'GET',
    pattern: '/api/workspaces/:workspaceId/lessons',
    handle: (params) => ({ status: 200, body: listLessons(params.workspaceId) }),
  },
  {
    method: 'POST',
    pattern: '/api/workspaces/:workspaceId/lessons/next',
    handle: (params) => {
      // Queues a job and answers `202`, which is all the real endpoint promises.
      queueNextLesson(params.workspaceId, GENERATION_DELAY_MS)

      return { status: 202, body: { message: 'Lesson generation queued.' } }
    },
  },
  {
    method: 'GET',
    pattern: '/api/lessons/:lessonId',
    handle: (params) => {
      const lesson = findLesson(params.lessonId)

      if (!lesson) {
        return notFound(`lesson ${params.lessonId}`)
      }

      return { status: 200, body: lesson }
    },
  },
]

function workspaceOr404(workspaceId: string): MockResponse {
  const workspace = findWorkspace(workspaceId)

  if (!workspace) {
    return notFound(`workspace ${workspaceId}`)
  }

  return envelope({ id: workspace.id, topic: workspace.topic })
}

function notFound(what: string): MockResponse {
  return {
    status: 404,
    body: {
      message: `The mock API has no ${what}. It answers ${routes
        .map((route) => `${route.method} ${route.pattern}`)
        .join(', ')}.`,
    },
  }
}

/** The login form sends `username`; the mock is happy to reflect back an email too. */
function readCredentials(body: string): { username: string; email: string | null } {
  try {
    const parsed = JSON.parse(body) as { username?: unknown; email?: unknown }

    return {
      username: typeof parsed.username === 'string' ? parsed.username : 'mock-learner',
      email: typeof parsed.email === 'string' ? parsed.email : null,
    }
  } catch {
    return { username: 'mock-learner', email: null }
  }
}

function toRegExp(pattern: string): RegExp {
  const source = pattern
    .split('/')
    .map((segment) => (segment.startsWith(':') ? '([^/]+)' : segment))
    .join('/')

  return new RegExp(`^${source}$`)
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = ''

    req.on('data', (chunk: Buffer) => {
      body += chunk.toString()
    })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}

function send(res: ServerResponse, { status, body }: MockResponse): void {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function mockMiddleware(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const method = req.method ?? 'GET'
  const path = (req.url ?? '').split('?')[0]

  const route = routes.find(
    (candidate) => candidate.method === method && toRegExp(candidate.pattern).test(path),
  )

  if (!route) {
    // Anything not under /api is the app's own routes, which this must not touch.
    if (!path.startsWith('/api/')) {
      res.statusCode = 404
      res.end()
      return Promise.resolve()
    }

    send(res, notFound(`${method} ${path}`))
    return Promise.resolve()
  }

  const params: Record<string, string> = {}
  const matched = toRegExp(route.pattern).exec(path)

  // Counted rather than indexed by segment position: the pattern contributes one
  // capture group per parameter, and the two numbers only coincide by accident.
  // Indexing by segment made every id bind to the empty string, which surfaced as
  // a lesson list that was always empty rather than as an error.
  let group = 0

  route.pattern.split('/').forEach((segment) => {
    if (segment.startsWith(':')) {
      group += 1
      params[segment.slice(1)] = decodeURIComponent(matched?.[group] ?? '')
    }
  })

  return readBody(req).then((body) => send(res, route.handle(params, body)))
}

export function mockApi(): Plugin {
  return {
    name: 'mock-api',
    // `serve` only: the plugin is not part of a build, and this is what makes that
    // true by construction rather than by remembering.
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        void mockMiddleware(req, res).catch(next)
      })

      // No port in this banner: `config.server.port` is the port that was asked
      // for, not the one bound, so it is wrong exactly when the default is taken
      // and the developer most needs to be told where the app is. Vite already
      // prints the real URL above this.
      console.log(
        [
          '',
          '  ┌──────────────────────────────────────────────────────────┐',
          '  │  mock API on, served from this dev server, same origin    │',
          '  │  sign in with any username                               │',
          '  │  asking for the next lesson resolves after 7 seconds     │',
          '  └──────────────────────────────────────────────────────────┘',
          '',
        ].join('\n'),
      )
    },
  }
}
