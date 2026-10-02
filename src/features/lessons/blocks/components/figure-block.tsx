import { useEffect, useId, useState } from 'react'
import { Box, Image, Paper, Stack, Text, useComputedColorScheme } from '@mantine/core'

import { followableUrl } from '../../lib/source-url'
import type { FigureBlock } from '../../schemas/lesson-schema'
import { diagramElementId, drawDiagram } from '../mermaid'
import { sanitiseLessonSvg } from '../sanitise-svg'
import { SidewaysScroll } from './sideways-scroll'

/**
 * A figure is a thing rather than a sentence, and every figure carries two things
 * a learner can rely on whatever the payload tried: **real alt text** and, when
 * there is one, a caption. When the figure itself cannot be shown, those words
 * are the fallback, so the block degrades to a description instead of a hole.
 *
 * Every figure sits in its own horizontal scroll viewport, like a code block. A
 * diagram or a wide picture is allowed to be wider than the column; what is not
 * allowed is a lesson that widens the page and pushes the prose out of view.
 *
 * Nothing here reads colour, size, or spacing from the payload. See ADR-0001.
 */
export function FigureBlockView({ block }: { block: FigureBlock }) {
  return (
    <Stack gap={4}>
      <SidewaysScroll label={`Figure: ${block.alt}`}>
        <Box w="fit-content" maw="100%">
          <FigureMedia block={block} />
        </Box>
      </SidewaysScroll>

      {block.caption ? (
        <Text component="p" size="sm" c="dimmed">
          {block.caption}
        </Text>
      ) : null}
    </Stack>
  )
}

function FigureMedia({ block }: { block: FigureBlock }) {
  switch (block.kind) {
    case 'image':
      return <ImageFigure source={block.source} alt={block.alt} />
    case 'svg':
      return <SvgFigure source={block.source} alt={block.alt} />
    case 'mermaid':
      // Keyed on the source so a lesson that swaps one diagram for another gets a
      // fresh drawing rather than the previous one held while the next renders.
      return <MermaidFigure key={block.source} source={block.source} alt={block.alt} />
  }
}

/**
 * Inline svg the model wrote, sanitised again here and then rendered.
 *
 * The stored copy is not trusted: the backend sanitised it, and ADR-0001 exists
 * because that layer will be bypassed again. Two layers with independent bug
 * histories, so a bypass in one does not reach the learner. The markup is
 * injected with `dangerouslySetInnerHTML`, which does not execute a `<script>` it
 * finds either — the sanitiser is what removes it, and this is only the second
 * thing standing between the payload and a browser.
 *
 * The drawing itself is hidden from assistive technology and the wrapper carries
 * the alt text instead, so a screen reader announces one description of the
 * figure rather than reading out every label inside the drawing.
 */
function SvgFigure({ source, alt }: { source: string; alt: string }) {
  return (
    <Box role="img" aria-label={alt}>
      <Box aria-hidden="true" dangerouslySetInnerHTML={{ __html: sanitiseLessonSvg(source) }} />
    </Box>
  )
}

/**
 * A picture at a url, and only ever at an `http` or `https` one.
 *
 * The url is whatever the model read off a web search result, so it is checked
 * with the same rule every other url in the reader uses: a scheme that is not
 * http or https is not followed. There is no safe destination for a learner who
 * clicks a `javascript:` image, so no image is rendered at all and the alt text
 * is shown in its place. See ADR-0001.
 */
function ImageFigure({ source, alt }: { source: string; alt: string }) {
  const url = followableUrl(source)

  if (!url) {
    return <FigureFallback alt={alt} reason="This picture could not be shown." role="note" />
  }

  return <Image src={url} alt={alt} />
}

/**
 * A diagram drawn by mermaid, which is loaded only now, when there is a diagram
 * to draw.
 *
 * Drawing is asynchronous and it can fail: the source is the model's, so a lesson
 * can arrive with a diagram mermaid cannot parse. Neither is allowed to cost the
 * learner the block. Until the drawing arrives the figure is its alt text, marked
 * busy, and if it never does the figure becomes its own words — the alt text the contract
 * guarantees and the caption that came with it — in a live region, because the
 * learner may well have read past the place where the diagram was going to be.
 */
function MermaidFigure({ source, alt }: { source: string; alt: string }) {
  const colorScheme = useComputedColorScheme('light')
  const reactId = useId()
  const [drawing, setDrawing] = useState<'waiting' | 'drawn' | 'failed'>('waiting')
  const [svg, setSvg] = useState('')

  useEffect(() => {
    let current = true

    drawDiagram({ id: diagramElementId(reactId), source, colorScheme })
      .then((markup) => {
        if (!current) {
          return
        }

        setSvg(markup)
        setDrawing('drawn')
      })
      .catch((error: unknown) => {
        if (!current) {
          return
        }

        // Logged with the reason, because a diagram that never renders is a
        // lesson-writing bug and nobody should have to guess which one.
        console.warn(
          `[lesson-reader] could not draw a mermaid diagram: ${String(error)}. ` +
            'Rendered the figure as its alt text instead.',
        )
        setDrawing('failed')
      })

    return () => {
      current = false
    }
  }, [colorScheme, reactId, source])

  if (drawing === 'failed') {
    return (
      <FigureFallback
        alt={alt}
        reason="This diagram could not be drawn, so here is what it shows."
        role="status"
      />
    )
  }

  // The figure exists, named, from the first render. While mermaid loads and
  // draws — seconds, the first time a lesson has a diagram — it is marked busy and
  // says so in a line of its own, holding a little height so the prose below
  // moves less when the drawing arrives. The drawing then lands inside this same
  // element: nothing new is inserted above the learner's place, and a figure they
  // focused or read past is the one that now holds the diagram.
  const waiting = drawing === 'waiting'

  return (
    <Box role="img" aria-label={alt} aria-busy={waiting || undefined}>
      {waiting ? (
        <Text size="sm" mih={96} py="sm">
          Drawing the diagram…
        </Text>
      ) : (
        <Box aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />
      )}
    </Box>
  )
}

/**
 * What a figure becomes when it cannot be drawn: the words the lesson wrote
 * about it, in place of the thing.
 *
 * `role="status"` when the loss was asynchronous, so a learner who has moved on
 * is told the diagram did not arrive, and `role="note"` when it was never going
 * to, because a note in the prose is not an event worth announcing.
 */
function FigureFallback({
  alt,
  reason,
  role,
}: {
  alt: string
  reason: string
  role: 'note' | 'status'
}) {
  return (
    <Paper role={role} p="sm" radius="md" bg="var(--mantine-color-default-hover)" maw={640}>
      <Text component="p" size="sm">
        {alt}
      </Text>
      <Text component="p" size="sm" c="dimmed">
        {reason}
      </Text>
    </Paper>
  )
}
