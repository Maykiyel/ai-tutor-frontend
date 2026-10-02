import { Alert, Box, Button, Card, Paper, Stack, Text, Title } from '@mantine/core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { Link } from 'react-router'

import { ErrorState } from '@/components/ui/error-state'
import { LoadingState } from '@/components/ui/loading-state'
import type { QuestionnaireAnswers } from '@/components/ui/questionnaire/questionnaire'
import { paths } from '@/config/paths'
import { missionQueries } from '@/lib/mission/mission-queries'

import { describeAnswers, toPrompt, type AnsweredQuestion } from '../lib/answers-to-prompt'
import {
  emptyTranscript,
  interviewKeys,
  interviewMutations,
  interviewQueries,
  type InterviewTranscript,
  type SendInterviewMessageVariables,
} from '../queries/interview-queries'
import type { InterviewQuestion, InterviewTurn } from '../schemas/interview-schema'
import { InterviewQuestions } from './interview-questions'
import { MissionDraftCard } from './mission-draft-card'

/**
 * When the tutor replies in prose, or with no questions it could be asked, the
 * learner still has to be able to answer. One open question stands in, and the
 * tutor's own words above it say what is being asked.
 */
const replyQuestion: InterviewQuestion = {
  id: 'reply',
  label: 'Your reply',
  type: 'open',
  options: [],
  required: true,
}

function openingQuestion(topic: string): InterviewQuestion {
  return {
    id: 'why',
    label: `Why do you want to learn ${topic}?`,
    type: 'open',
    options: [],
    required: true,
  }
}

function LearnerAnswers({ answers }: { answers: AnsweredQuestion[] }) {
  return (
    <Paper withBorder radius="md" p="md" bg="var(--mantine-color-default-hover)">
      <Text size="xs" fw={600} c="dimmed" mb="xs">
        You
      </Text>
      <Stack gap="sm">
        {answers.map(({ question, answer }, index) => (
          <div key={index}>
            <Text size="sm" c="dimmed">
              {question}
            </Text>
            <Text style={{ whiteSpace: 'pre-wrap' }}>{answer}</Text>
          </div>
        ))}
      </Stack>
    </Paper>
  )
}

function TutorMessage({ turn }: { turn: InterviewTurn }) {
  return (
    <Box>
      <Text size="xs" fw={600} c="dimmed" mb={4}>
        Tutor
      </Text>
      {/* Model output, rendered as text (ADR-0001). */}
      <Text maw="65ch" style={{ whiteSpace: 'pre-wrap' }}>
        {turn.message}
      </Text>
    </Box>
  )
}

type MissionInterviewProps = {
  workspaceId: string
  topic: string
}

/**
 * The mission interview: the tutor asks, the learner answers through the
 * questionnaire, and the turns repeat until the tutor has a mission concrete
 * enough to teach to. It ends on the drafted mission and its confirm step.
 *
 * A workspace that already has an active mission does not run the interview:
 * changing a mission is a separate, confirmed revision, and it is not built.
 */
export function MissionInterview({ workspaceId, topic }: MissionInterviewProps) {
  const mission = useQuery(missionQueries.mission(workspaceId))

  if (mission.isPending) {
    return <LoadingState message="Checking this workspace's mission..." />
  }

  if (mission.isError) {
    return (
      <ErrorState
        title="This mission could not be loaded"
        message="Nothing is lost. Try again."
        onRetry={() => void mission.refetch()}
      />
    )
  }

  return (
    <Stack gap="lg" py="xl" maw={720}>
      <div>
        <Title order={1}>Mission interview</Title>
        <Text c="dimmed">
          {topic}: a few questions until the reason you are learning it is concrete.
        </Text>
      </div>

      {mission.data?.is_active ? (
        <Stack gap="xs" align="flex-start">
          <Text>This workspace already has an active mission.</Text>
          <Text size="sm" c="dimmed">
            Changing it is a separate step, which is not built yet.
          </Text>
          <Button component={Link} to={paths.workspaces.home.getHref(workspaceId)} variant="light">
            Back to the workspace
          </Button>
        </Stack>
      ) : (
        <Conversation workspaceId={workspaceId} topic={topic} />
      )}
    </Stack>
  )
}

function Conversation({ workspaceId, topic }: MissionInterviewProps) {
  const queryClient = useQueryClient()
  const transcriptKey = interviewKeys.transcript(workspaceId)
  const { data: transcript } = useQuery(interviewQueries.transcript(workspaceId))

  const send = useMutation({
    ...interviewMutations.send(),
    onSuccess: (turn, variables) => {
      queryClient.setQueryData<InterviewTranscript>(transcriptKey, (current = emptyTranscript) => ({
        conversationId: turn.conversationId,
        entries: [
          ...current.entries,
          { role: 'learner', answers: variables.answers },
          { role: 'tutor', turn },
        ],
      }))
    },
  })

  const latestRef = useRef<HTMLDivElement>(null)
  const seenEntries = useRef(transcript.entries.length)

  useEffect(() => {
    // A new reply is where the learner's attention belongs, so focus moves to
    // it and a screen reader reads it. Only a reply that arrives while the
    // screen is open counts: coming back to an interview in progress does not
    // pull focus away from wherever the learner put it.
    if (transcript.entries.length > seenEntries.current) {
      latestRef.current?.focus()
    }

    seenEntries.current = transcript.entries.length
  }, [transcript.entries.length])

  const lastEntry = transcript.entries.at(-1)
  const latestTurn = lastEntry?.role === 'tutor' ? lastEntry.turn : null
  const complete = latestTurn?.status === 'complete'

  function sendAnswers(questions: InterviewQuestion[], answers: QuestionnaireAnswers) {
    const answered = describeAnswers(questions, answers)
    const opening = transcript.conversationId === null

    const variables: SendInterviewMessageVariables = {
      // The tutor has no workspace to read the topic from, so the opening
      // message carries it.
      prompt: opening ? `I want to learn ${topic}.\n\n${toPrompt(answered)}` : toPrompt(answered),
      conversationId: transcript.conversationId,
      answers: answered,
    }

    send.mutate(variables)
  }

  function startOver() {
    send.reset()
    queryClient.setQueryData(transcriptKey, emptyTranscript)
  }

  const questions = latestTurn
    ? latestTurn.questions.length > 0
      ? latestTurn.questions
      : [replyQuestion]
    : [openingQuestion(topic)]

  return (
    <Stack gap="lg">
      {transcript.entries.length > 0 ? (
        <Box component="section" aria-label="The interview so far">
          <Stack gap="md">
            {transcript.entries.map((entry, index) => {
              const isLatest = index === transcript.entries.length - 1

              if (entry.role === 'learner') {
                return <LearnerAnswers key={index} answers={entry.answers} />
              }

              // The reply that ends the interview introduces a lesson this screen
              // does not show, so it is replaced with words about the mission.
              if (entry.turn.status === 'complete') {
                return (
                  <Box key={index} ref={isLatest ? latestRef : undefined} tabIndex={-1}>
                    <Text fw={600}>The tutor has what it needs.</Text>
                    <Text c="dimmed">Check the mission it drafted from your answers.</Text>
                  </Box>
                )
              }

              return (
                <Box key={index} ref={isLatest ? latestRef : undefined} tabIndex={-1}>
                  <TutorMessage turn={entry.turn} />
                </Box>
              )
            })}
          </Stack>
        </Box>
      ) : null}

      {complete ? (
        <MissionDraftCard draft={latestTurn.missionDraft} onStartOver={startOver} />
      ) : (
        <Card withBorder radius="md" padding="lg">
          <Stack gap="md">
            {send.isError ? (
              <Alert color="red" role="alert">
                The tutor did not reply. Your answers are still here, so you can send them again.
              </Alert>
            ) : null}

            {/*
              Keyed by the turn, so each reply starts a fresh questionnaire and a
              failed send keeps the one the learner filled in.
            */}
            <InterviewQuestions
              key={transcript.entries.length}
              questions={questions}
              pending={send.isPending}
              submitLabel={latestTurn ? 'Send answers' : 'Start the interview'}
              descriptions={
                latestTurn
                  ? {}
                  : {
                      why: 'Something concrete works best: what you want to be able to do, and by when.',
                    }
              }
              onSubmit={(answers) => sendAnswers(questions, answers)}
            />

            {/* In the document before it has anything to say, so the words are announced. */}
            <Text size="sm" c="dimmed" role="status">
              {send.isPending ? 'The tutor is reading your answers...' : null}
            </Text>
          </Stack>
        </Card>
      )}
    </Stack>
  )
}
