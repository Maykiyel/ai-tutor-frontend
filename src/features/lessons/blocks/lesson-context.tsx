import { createContext, useContext, type PropsWithChildren } from 'react'

import type { HydratedResource, HydratedTerm, ParsedLessonResponse } from '../schemas/lesson-schema'

/**
 * What a block may know about the response beyond its own fields.
 *
 * Block components take `{ block }` and nothing else, so that adding a block type
 * never means changing the props every existing block takes. A block that needs
 * more — a term's definition, a cited source's url, the lesson it belongs to —
 * reads it from here instead of from a wider prop type.
 */
export type LessonContextValue = {
  /** The lesson header, minus its blocks, which are parsed per block. */
  header: ParsedLessonResponse['lesson']
  /** Glossary terms hydrated by the backend, keyed by term id. */
  terms: Record<string, HydratedTerm>
  /** Sources the lesson cites, keyed by resource id. */
  resources: Record<string, HydratedResource>
}

const LessonContext = createContext<LessonContextValue | null>(null)

export function LessonProvider({
  lesson,
  children,
}: PropsWithChildren<{ lesson: ParsedLessonResponse }>) {
  return (
    <LessonContext.Provider
      value={{
        header: lesson.lesson,
        terms: lesson.terms,
        resources: lesson.resources,
      }}
    >
      {children}
    </LessonContext.Provider>
  )
}

/**
 * Null when a block is rendered outside a lesson, which is a mistake worth
 * surfacing rather than silently rendering a block with no lesson around it.
 */
export function useLesson(): LessonContextValue {
  const lesson = useContext(LessonContext)

  if (!lesson) {
    throw new Error('useLesson must be used inside a LessonProvider')
  }

  return lesson
}
