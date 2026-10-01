import { Box, Group, Stack, Text, Title, Anchor } from '@mantine/core'
import { Link, useParams } from 'react-router'

import { paths } from '@/config/paths'
import type { LessonHeader, LessonKind } from '../schemas/lesson-schema'

const kindLabels: Record<LessonKind, string> = {
  concept: 'Concept',
  'hands-on': 'Hands-on',
  review: 'Review',
}

/**
 * What the learner is opening: which lesson, what kind, the single skill it
 * teaches, how it ties to their mission, and how long it takes. The mission link
 * is the payload's own `missionLink` — the lesson saying, in the learner's terms,
 * why this is worth their time — not a route.
 */
export function LessonHeaderView({ lesson }: { lesson: LessonHeader }) {
  return (
    <Box component="header">
      <Group gap="xs" mb="xs">
        <Text size="sm" fw={700} tt="uppercase" c="dimmed">
          Lesson {lesson.number} · {kindLabels[lesson.kind]}
        </Text>
        <Text size="sm" c="dimmed">
          {lesson.minutes} min
        </Text>
      </Group>

      <Title order={1}>{lesson.title}</Title>

      <Stack gap="xs" mt="md">
        <Box>
          <Text size="sm" fw={700}>
            Skill
          </Text>
          <Text>{lesson.skill}</Text>
        </Box>

        <Box>
          <Text size="sm" fw={700}>
            How this ties to your mission
          </Text>
          <Text>{lesson.missionLink}</Text>
        </Box>
      </Stack>
    </Box>
  )
}

/**
 * A way back out of a lesson, so reading one is never a dead end. The list is
 * built in a later ticket, but this is its destination and resolves the moment
 * that screen exists.
 */
export function BackToLessonsLink() {
  const { workspaceId = '' } = useParams()

  return (
    <Anchor component={Link} to={paths.workspaces.lessons.getHref(workspaceId)} size="sm">
      All lessons
    </Anchor>
  )
}
