import { Anchor, Box, List, Stack, Text, Title } from '@mantine/core'

import { useLesson } from '../blocks/lesson-context'
import { externalLinkAttributes, followableUrl } from '../lib/source-url'

/**
 * The sources a lesson cites, at the foot of the lesson.
 *
 * A citation in the prose says *that* something is sourced; this says *which*
 * source, by name, so the learner can choose one to open rather than guess. It
 * is built from the same hydrated resources map the `cite` segments resolve
 * against, so a citation that cannot be followed is not listed as a link either,
 * and **no second request is ever made**: the ids in the payload point at records
 * the response already carries.
 *
 * The primary source is marked as a recommendation in words, with the lesson's
 * own reason for it. A highlight the learner has to interpret is not a
 * recommendation; a sentence is.
 */
export function LessonSourceList() {
  const { header, resources } = useLesson()
  const entries = Object.entries(resources)

  if (entries.length === 0) {
    return null
  }

  return (
    <Box component="section" aria-labelledby="lesson-sources-heading">
      <Title order={2} id="lesson-sources-heading">
        Sources
      </Title>

      <List mt="sm" spacing="sm" withPadding={false}>
        {entries.map(([resourceId, resource]) => {
          const url = followableUrl(resource.url)
          const isPrimary = resourceId === String(header.primarySource.resourceId)

          return (
            <List.Item key={resourceId}>
              <Stack gap={2}>
                {url ? (
                  <Anchor component="a" href={url} {...externalLinkAttributes}>
                    {resource.title}
                  </Anchor>
                ) : (
                  // A source whose url is not http or https is named but not
                  // linked: there is nowhere safe for the learner to click. See
                  // ADR-0001.
                  <Text component="span" fw={500}>
                    {resource.title}
                  </Text>
                )}

                {isPrimary ? (
                  <Text component="p" size="sm">
                    Read this first: {header.primarySource.why}
                  </Text>
                ) : null}
              </Stack>
            </List.Item>
          )
        })}
      </List>
    </Box>
  )
}
