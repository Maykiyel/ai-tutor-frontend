import type { PropsWithChildren } from 'react'
import { ScrollArea } from '@mantine/core'

import styles from './sideways-scroll.module.css'

/**
 * The horizontal scroll viewport a code sample, a table, and a figure each sit in,
 * so that a wide one scrolls inside its own box rather than widening the page.
 *
 * **The viewport is a tab stop.** A box that scrolls sideways and cannot take
 * focus is a box whose far edge a keyboard learner never reaches: the arrow keys
 * scroll whatever has focus, and nothing inside a code sample or a figure can take
 * it. So the viewport takes focus itself, and it is a named group so that landing
 * on it says what it holds rather than announcing an unnamed box.
 *
 * It is a tab stop whether or not the content overflows on this screen. Whether a
 * line overflows depends on the learner's window and zoom, which change while they
 * read, and a tab order that rearranged itself as they zoomed would be worse than
 * one extra stop.
 *
 * `scrollbarSize` is raised and the scrollbar shows whenever there is overflow,
 * because a reader who cannot see that a line continues past the edge has no way
 * to know to scroll.
 */
export function SidewaysScroll({ label, children }: PropsWithChildren<{ label: string }>) {
  return (
    <ScrollArea
      type="auto"
      scrollbars="x"
      offsetScrollbars
      scrollbarSize={12}
      viewportProps={{
        tabIndex: 0,
        role: 'group',
        'aria-label': label,
        className: styles.viewport,
      }}
    >
      {children}
    </ScrollArea>
  )
}
