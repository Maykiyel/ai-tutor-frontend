import { LessonReader } from '@/features/lessons/components/lesson-reader'

/**
 * A lesson, read. The route owns nothing but the path: the reader is a feature
 * component, so the screen can be rendered from a fixture in a test without the
 * router, and the router can change without touching the reader.
 */
export function WorkspaceLessonPage() {
  return <LessonReader />
}
