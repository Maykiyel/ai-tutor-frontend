import { build } from 'vite'

import { describe, expect, it } from 'vitest'

/**
 * One chunk of the rollup output, as far as this test needs to know it.
 *
 * Typed locally rather than imported from rollup: vite 8 bundles its own bundler
 * and rollup is not a dependency of this project, so a type import from it would
 * be a dependency this test invented.
 */
type BuiltChunk = {
  type: string
  fileName: string
  isEntry?: boolean
  imports: string[]
  dynamicImports: string[]
  moduleIds: string[]
  code: string
}

type BuiltOutput = { output: BuiltChunk[] }

/**
 * Mermaid is several megabytes, so it is behind a dynamic `import()`. This test
 * does not take the code's word for it: it **builds the app** and reads the chunk
 * graph, because "loaded lazily" is a claim about the output and only the output
 * can settle it.
 *
 * A test that merely asserted the source contains no top-level `import 'mermaid'`
 * would pass just as well with a bundler that inlined the whole thing into the
 * entry chunk, which is the failure this is here to catch. So the assertions are:
 *
 * 1. Mermaid is in the build at all. Without this the next two are vacuous — a
 *    file that imported nothing would pass them.
 * 2. No chunk the entry reaches by a **static** import contains a mermaid module.
 * 3. Mermaid *is* reachable from the entry, but only through a **dynamic** import,
 *    so the lazy load is wired to something real rather than being dead code.
 *
 * The build is the slow part, which is why this is one test that checks all three
 * rather than three that each rebuild the app.
 */
describe('mermaid in the built app', () => {
  it('is not in the initial bundle, and is still reachable when a diagram is drawn', async () => {
    // The app's own `vite.config.ts`, found the way `pnpm build` finds it, with
    // `write: false` so the check costs a build and not a build plus a `dist` to
    // clean up. Importing the config into this test instead would evaluate it
    // under jsdom, which is not where a build config belongs.
    const result = (await build({
      logLevel: 'error',
      build: { write: false, emptyOutDir: false },
    })) as BuiltOutput | BuiltOutput[]

    const chunks = (Array.isArray(result) ? result : [result]).flatMap((output) => output.output)
    const byFileName = new Map(chunks.map((chunk) => [chunk.fileName, chunk]))

    const entry = chunks.find((chunk) => chunk.isEntry)

    if (!entry) {
      throw new Error('the build produced no entry chunk, so there is no initial bundle to check')
    }

    const isMermaid = (chunk: BuiltChunk | undefined) =>
      (chunk?.moduleIds ?? []).some((id) => id.includes('node_modules/mermaid'))

    /** Chunk names reachable without waiting for anything: static imports only. */
    const staticClosure = (start: string): string[] => {
      const seen = new Set<string>()
      const queue = [start]

      while (queue.length > 0) {
        const name = queue.pop() as string

        if (seen.has(name)) {
          continue
        }

        seen.add(name)
        queue.push(...(byFileName.get(name)?.imports ?? []))
      }

      return [...seen]
    }

    const initialChunks = staticClosure(entry.fileName)
    const initialModules = initialChunks.flatMap((name) => byFileName.get(name)?.moduleIds ?? [])

    expect(
      initialModules.filter((id) => id.includes('node_modules/mermaid')),
      'mermaid reached the entry chunk by a static import, so every learner downloads it',
    ).toEqual([])

    // The other direction, and the one that keeps the test honest: mermaid has to
    // be in the build, or the assertion above would be true of an app that simply
    // never ships a diagram.
    const mermaidChunks = chunks.filter((chunk) => isMermaid(chunk))
    expect(mermaidChunks.length, 'mermaid is nowhere in the build').toBeGreaterThan(0)

    const dynamicallyReachable = new Set(
      initialChunks.flatMap((name) => byFileName.get(name)?.dynamicImports ?? []),
    )
    const queue = [...dynamicallyReachable]

    while (queue.length > 0) {
      const name = queue.pop() as string

      if (dynamicallyReachable.has(name)) {
        continue
      }

      dynamicallyReachable.add(name)
      queue.push(...(byFileName.get(name)?.imports ?? []))
    }

    expect(
      [...dynamicallyReachable].filter((name) => isMermaid(byFileName.get(name))),
      'mermaid is in the build but nothing loads it, so no diagram would ever draw',
    ).not.toEqual([])
  }, 600_000)
})
