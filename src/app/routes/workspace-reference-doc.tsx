import { NotYetBuilt } from '@/components/ui/not-yet-built'

/**
 * Where a lesson's `link` segment sends a learner who is looking something up.
 * The document itself is build-order step 5 and is not built yet, but the route
 * exists because a lesson already links here: a link that resolves to a 404 is
 * worse than a page that says what it will be.
 */
export function WorkspaceReferenceDocPage() {
  return (
    <NotYetBuilt
      title="Reference doc"
      description="The cheat sheet distilled from your own lessons, with print styles. Lessons link straight here rather than repeating what a document already says."
    />
  )
}
