import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getMission } from '@/lib/mission/mission-api'
import { missionResponse, noMissionResponse } from '@/lib/mission/mission-fixtures'
import { missionResponseSchema } from '@/lib/mission/mission-schema'
import { renderWithRouter, screen, within } from '@/test/test-utils'

import { sendInterviewMessage } from '../api/interview-api'
import {
  completeTurnResponse,
  completeTurnWithLessonResponse,
  openingTurnResponse,
  rawJsonTurnResponse,
  unparsedTurnResponse,
  unsavedCompleteTurnResponse,
} from '../fixtures/interview-fixtures'
import { interviewTurnResponseSchema } from '../schemas/interview-schema'
import { MissionInterview } from './mission-interview'

vi.mock('../api/interview-api')
vi.mock('@/lib/mission/mission-api')

const openingTurn = interviewTurnResponseSchema.parse(openingTurnResponse)
const completeTurn = interviewTurnResponseSchema.parse(completeTurnResponse)
const completeTurnWithLesson = interviewTurnResponseSchema.parse(completeTurnWithLessonResponse)
const unparsedTurn = interviewTurnResponseSchema.parse(unparsedTurnResponse)
const rawJsonTurn = interviewTurnResponseSchema.parse(rawJsonTurnResponse)
const unsavedCompleteTurn = interviewTurnResponseSchema.parse(unsavedCompleteTurnResponse)

function renderInterview(props?: Partial<Parameters<typeof MissionInterview>[0]>) {
  return renderWithRouter(<MissionInterview workspaceId="7" topic="Algebra" {...props} />)
}

async function answerOpening(user: ReturnType<typeof userEvent.setup>) {
  await user.type(
    await screen.findByRole('textbox', { name: 'Your answer' }),
    'Pass the placement test.',
  )
  await user.click(screen.getByRole('button', { name: 'Start the interview' }))
}

describe('MissionInterview', () => {
  beforeEach(() => {
    vi.mocked(sendInterviewMessage).mockReset()
    vi.mocked(getMission).mockReset()
    vi.mocked(getMission).mockResolvedValue(missionResponseSchema.parse(noMissionResponse))
  })

  it('opens by asking why the learner wants the topic, and will not start without an answer', async () => {
    const user = userEvent.setup()

    renderInterview()

    expect(
      await screen.findByRole('group', { name: 'Why do you want to learn Algebra?' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Start the interview' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Answer this question to continue.')
    expect(sendInterviewMessage).not.toHaveBeenCalled()
  })

  it('sends the topic with the opening answer and asks the questions the tutor sent back', async () => {
    const user = userEvent.setup()

    vi.mocked(sendInterviewMessage).mockResolvedValue(openingTurn)

    renderInterview()
    await answerOpening(user)

    expect(sendInterviewMessage).toHaveBeenCalledWith({
      prompt:
        'I want to learn Algebra.\n\nWhy do you want to learn Algebra?\nPass the placement test.',
      workspaceId: '7',
      conversationId: null,
    })

    expect(await screen.findByText(/a good, concrete reason/i)).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'When is the placement test?' })).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Question 1 of 3' })).toBeInTheDocument()

    // The learner's own answer stays in the conversation above.
    const soFar = screen.getByRole('region', { name: 'The interview so far' })

    expect(within(soFar).getByText('Pass the placement test.')).toBeInTheDocument()
  })

  it('answers a turn through the questionnaire and continues the same conversation', async () => {
    const user = userEvent.setup()

    vi.mocked(sendInterviewMessage)
      .mockResolvedValueOnce(openingTurn)
      .mockResolvedValueOnce(unparsedTurn)

    renderInterview()
    await answerOpening(user)

    await user.click(await screen.findByRole('radio', { name: 'This term' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Skip' }))
    await user.type(screen.getByRole('textbox', { name: 'Your answer' }), 'Two hours')
    await user.click(screen.getByRole('button', { name: 'Send answers' }))

    expect(sendInterviewMessage).toHaveBeenLastCalledWith({
      prompt:
        'When is the placement test?\nThis term\n\n' +
        'Which parts feel shakiest?\nSkipped.\n\n' +
        'How much time can you give it each week?\nTwo hours',
      workspaceId: '7',
      conversationId: 'conv-1',
    })

    // A reply the model wrote in prose still leaves the learner a way to answer.
    expect(await screen.findByText(/what would passing the test let you do/i)).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Your reply' })).toBeInTheDocument()
  })

  it('ends on the mission the backend saved, leading back to the workspace', async () => {
    const user = userEvent.setup()

    vi.mocked(sendInterviewMessage).mockResolvedValue(completeTurn)

    renderInterview()
    await answerOpening(user)

    expect(await screen.findByRole('heading', { name: 'Your mission' })).toBeInTheDocument()
    expect(screen.getByText('Saved')).toBeInTheDocument()
    expect(screen.getByText(/saved this mission to the workspace/i)).toBeInTheDocument()
    expect(screen.getByText(/help my brother with his homework/i)).toBeInTheDocument()
    expect(screen.getByText('Score 80% or better')).toBeInTheDocument()
    expect(screen.getByText('Two hours a week, weekdays only')).toBeInTheDocument()
    expect(screen.getByText('Geometry')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to the workspace' })).toHaveAttribute(
      'href',
      '/workspaces/7/home',
    )
    expect(screen.queryByRole('button', { name: 'Start over' })).not.toBeInTheDocument()
    // Without a preview composed in, only the handoff words show.
    expect(screen.queryByText(/this first lesson covers/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /send answers/i })).not.toBeInTheDocument()
  })

  it('ends on an unsaved draft that can only be started over', async () => {
    const user = userEvent.setup()

    vi.mocked(sendInterviewMessage).mockResolvedValue(unsavedCompleteTurn)

    renderInterview()
    await answerOpening(user)

    expect(await screen.findByText('Draft')).toBeInTheDocument()
    expect(screen.getByText(/not saved to the workspace/i)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Go to the workspace' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start over' })).toBeInTheDocument()
  })

  it('keeps the finished interview on screen once the saved mission reads back as active', async () => {
    const user = userEvent.setup()

    vi.mocked(sendInterviewMessage).mockResolvedValue(completeTurnWithLesson)
    vi.mocked(getMission)
      .mockResolvedValueOnce(missionResponseSchema.parse(noMissionResponse))
      .mockResolvedValue(missionResponseSchema.parse(missionResponse))
    const onLessonSaved = vi.fn()

    renderInterview({
      onLessonSaved,
      renderLessonPreview: (data) => <div data-testid="lesson-preview">{data.lessonId}</div>,
    })
    await answerOpening(user)

    expect(await screen.findByTestId('lesson-preview')).toHaveTextContent('31')
    expect(onLessonSaved).toHaveBeenCalledOnce()

    // The saved mission is refetched and now reads as active.
    await vi.waitFor(() => expect(getMission).toHaveBeenCalledTimes(2))
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(screen.queryByText(/already has an active mission/i)).not.toBeInTheDocument()
    expect(screen.getByTestId('lesson-preview')).toBeInTheDocument()
  })

  it('shows the generated lesson under the mission when the route composes a preview in', async () => {
    const user = userEvent.setup()

    vi.mocked(sendInterviewMessage).mockResolvedValue(completeTurnWithLesson)

    // A stand-in for the lessons feature's preview: the interview owns the
    // slot, not the lesson UI.
    renderInterview({
      renderLessonPreview: (data) => (
        <div data-testid="lesson-preview">{(data.lesson as { title?: string }).title}</div>
      ),
    })
    await answerOpening(user)

    expect(await screen.findByRole('heading', { name: 'Your mission' })).toBeInTheDocument()
    expect(screen.getByTestId('lesson-preview')).toHaveTextContent('Two-step equations')
  })

  it('never prints a reply the backend could not parse, and the learner can answer again', async () => {
    const user = userEvent.setup()

    vi.mocked(sendInterviewMessage)
      .mockResolvedValueOnce(rawJsonTurn)
      .mockResolvedValueOnce(openingTurn)

    renderInterview()
    await answerOpening(user)

    expect(await screen.findByText(/could not be read/i)).toBeInTheDocument()
    expect(screen.queryByText(/"phase": "interviewing"/i)).not.toBeInTheDocument()

    // The interview continues: the learner's answers are above and the reply
    // question stands in below.
    expect(screen.getByRole('group', { name: 'Your reply' })).toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: 'Your answer' }), 'Trying again.')
    await user.click(screen.getByRole('button', { name: 'Send answers' }))

    expect(sendInterviewMessage).toHaveBeenLastCalledWith({
      prompt: 'Your reply\nTrying again.',
      workspaceId: '7',
      conversationId: 'conv-1',
    })
    expect(await screen.findByText(/a good, concrete reason/i)).toBeInTheDocument()
  })

  it('starts over from the opening question', async () => {
    const user = userEvent.setup()

    vi.mocked(sendInterviewMessage).mockResolvedValue(unsavedCompleteTurn)

    renderInterview()
    await answerOpening(user)
    await user.click(await screen.findByRole('button', { name: 'Start over' }))

    expect(
      screen.getByRole('group', { name: 'Why do you want to learn Algebra?' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'The interview so far' })).not.toBeInTheDocument()
  })

  it('keeps the answers when the tutor does not reply, so they can be sent again', async () => {
    const user = userEvent.setup()

    vi.mocked(sendInterviewMessage)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(openingTurn)

    renderInterview()
    await answerOpening(user)

    expect(await screen.findByText(/the tutor did not reply/i)).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Your answer' })).toHaveValue(
      'Pass the placement test.',
    )

    await user.click(screen.getByRole('button', { name: 'Start the interview' }))

    expect(
      await screen.findByRole('group', { name: 'When is the placement test?' }),
    ).toBeInTheDocument()
  })

  it('does not run the interview for a workspace that already has an active mission', async () => {
    vi.mocked(getMission).mockResolvedValue(missionResponseSchema.parse(missionResponse))

    renderInterview()

    expect(await screen.findByText(/already has an active mission/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Start the interview' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to the workspace' })).toBeInTheDocument()
  })
})
