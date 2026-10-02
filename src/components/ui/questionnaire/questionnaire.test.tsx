import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { renderWithProviders, screen } from '@/test/test-utils'

import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoices,
  QuestionnaireDescription,
  QuestionnaireError,
  QuestionnaireInput,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireProgress,
  QuestionnaireSkip,
  QuestionnaireSubmit,
  QuestionnaireTitle,
  type QuestionnaireAnswer,
  type QuestionnaireItemConfig,
} from './questionnaire'

const items: QuestionnaireItemConfig[] = [
  { name: 'direction', required: true },
  { name: 'tools', required: true },
  { name: 'detail', required: false },
]

function renderQuestionnaire(
  options: {
    onSubmit?: (answers: Record<string, QuestionnaireAnswer>) => void
    items?: QuestionnaireItemConfig[]
    disabled?: boolean
  } = {},
) {
  const onSubmit = options.onSubmit ?? vi.fn()

  renderWithProviders(
    <Questionnaire
      items={options.items ?? items}
      onSubmit={onSubmit}
      disabled={options.disabled}
      aria-label="Planning"
    >
      <QuestionnaireProgress />

      <QuestionnaireItem name="direction">
        <QuestionnaireTitle>What should we prototype next?</QuestionnaireTitle>
        <QuestionnaireDescription>Choose a direction or write your own.</QuestionnaireDescription>
        <QuestionnaireChoices>
          <QuestionnaireChoice value="delegation">Delegation</QuestionnaireChoice>
          <QuestionnaireChoice value="questions">Question prompts</QuestionnaireChoice>
          <QuestionnaireInput aria-label="Another answer" />
        </QuestionnaireChoices>
        <QuestionnaireError />
      </QuestionnaireItem>

      <QuestionnaireItem name="tools" multiple>
        <QuestionnaireTitle>Which tools do you use?</QuestionnaireTitle>
        <QuestionnaireChoices>
          <QuestionnaireChoice value="figma">Figma</QuestionnaireChoice>
          <QuestionnaireChoice value="code">Code</QuestionnaireChoice>
        </QuestionnaireChoices>
        <QuestionnaireError />
      </QuestionnaireItem>

      <QuestionnaireItem name="detail">
        <QuestionnaireTitle>How much detail should it include?</QuestionnaireTitle>
        <QuestionnaireChoices>
          <QuestionnaireInput aria-label="Detail" />
        </QuestionnaireChoices>
        <QuestionnaireError />
      </QuestionnaireItem>

      <QuestionnaireActions>
        <QuestionnairePrevious />
        <QuestionnaireSkip />
        <QuestionnaireNext />
        <QuestionnaireSubmit />
      </QuestionnaireActions>
    </Questionnaire>,
  )

  return { onSubmit }
}

describe('Questionnaire', () => {
  it('shows one question at a time as a named group, with its progress', () => {
    renderQuestionnaire()

    const group = screen.getByRole('group', { name: 'What should we prototype next?' })

    expect(group).toHaveAccessibleDescription('Choose a direction or write your own.')
    expect(screen.queryByText('Which tools do you use?')).not.toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Question 1 of 3' })).toBeInTheDocument()
    // Nothing to go back to, a required question cannot be skipped, and it is not the last.
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Skip' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Submit' })).not.toBeInTheDocument()
  })

  it('stops on an unanswered required question, says why, and focuses an answer', async () => {
    const user = userEvent.setup()

    renderQuestionnaire()

    await user.click(screen.getByRole('button', { name: 'Next' }))

    const group = screen.getByRole('group', { name: 'What should we prototype next?' })

    expect(screen.getByRole('alert')).toHaveTextContent('Answer this question to continue.')
    expect(group).toHaveAttribute('aria-invalid', 'true')
    expect(group).toHaveAccessibleDescription(/answer this question to continue/i)
    expect(screen.getByRole('radio', { name: 'Delegation' })).toHaveFocus()
  })

  it('clears the error once the learner answers', async () => {
    const user = userEvent.setup()

    renderQuestionnaire()

    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('radio', { name: 'Question prompts' }))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('moves forward, focuses the new question, and keeps answers when going back', async () => {
    const user = userEvent.setup()

    renderQuestionnaire()

    await user.click(screen.getByRole('radio', { name: 'Delegation' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))

    const tools = screen.getByRole('group', { name: 'Which tools do you use?' })

    expect(tools).toHaveFocus()
    expect(screen.getByRole('progressbar', { name: 'Question 2 of 3' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Back' }))

    expect(screen.getByRole('radio', { name: 'Delegation' })).toBeChecked()
  })

  it('treats a written answer and a fixed choice as one or the other on a single-choice question', async () => {
    const user = userEvent.setup()

    renderQuestionnaire()

    await user.click(screen.getByRole('radio', { name: 'Delegation' }))
    await user.type(screen.getByRole('textbox', { name: 'Another answer' }), 'Both')

    expect(screen.getByRole('radio', { name: 'Delegation' })).not.toBeChecked()

    await user.click(screen.getByRole('radio', { name: 'Delegation' }))

    expect(screen.getByRole('textbox', { name: 'Another answer' })).toHaveValue('')
  })

  it('accepts more than one choice on a multiple question, skips an optional one, and submits', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderQuestionnaire()

    await user.type(screen.getByRole('textbox', { name: 'Another answer' }), 'Both together')
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('checkbox', { name: 'Figma' }))
    await user.click(screen.getByRole('checkbox', { name: 'Code' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Skip' }))

    expect(onSubmit).toHaveBeenCalledWith({
      direction: { choices: [], text: 'Both together', skipped: false },
      tools: { choices: ['figma', 'code'], text: '', skipped: false },
      detail: { choices: [], text: '', skipped: true },
    })
  })

  it('leaves a disabled question out of navigation, progress and the answers', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderQuestionnaire({
      items: [
        { name: 'direction', required: true },
        { name: 'tools', required: true, disabled: true },
        { name: 'detail' },
      ],
    })

    expect(screen.getByRole('progressbar', { name: 'Question 1 of 2' })).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Delegation' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(screen.getByRole('group', { name: /how much detail/i })).toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: 'Detail' }), 'Focused')
    await user.click(screen.getByRole('button', { name: 'Submit' }))

    expect(onSubmit).toHaveBeenCalledWith({
      direction: { choices: ['delegation'], text: '', skipped: false },
      detail: { choices: [], text: 'Focused', skipped: false },
    })
  })

  it('locks every answer and action while disabled', () => {
    renderQuestionnaire({ disabled: true })

    expect(screen.getByRole('radio', { name: 'Delegation' })).toBeDisabled()
    expect(screen.getByRole('textbox', { name: 'Another answer' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  })
})
