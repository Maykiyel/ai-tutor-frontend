import { describe, expect, it } from 'vitest'

import { renderWithProviders, screen } from '@/test/test-utils'

import { LessonPreview, type InterviewLessonPayload } from './lesson-preview'

/** A small but complete lesson in the contract shape `POST /api/test-teach` sends. */
function previewPayload(): InterviewLessonPayload {
  return {
    lesson: {
      schemaVersion: 1,
      number: 1,
      kind: 'concept',
      slug: 'two-step-equations',
      title: 'Two-step equations',
      skill: 'Solve an equation that needs two operations.',
      missionLink: 'Almost every problem in the practice set needs this one move.',
      minutes: 8,
      primarySource: {
        resourceId: 1,
        why: 'It works one equation at a time, which is the pace you read at.',
      },
      blocks: [
        { type: 'heading', level: 2, text: 'One operation, both sides' },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'An equation is a claim that two things are equal.',
            },
          ],
        },
        { type: 'table', headers: [], rows: 'not rows' },
      ],
    },
    terms: {},
    resources: {
      '1': { title: 'Two-step equations, worked slowly', url: 'https://example.org/two-step' },
    },
  }
}

describe('LessonPreview', () => {
  it('renders the lesson blocks the tutor generated', () => {
    renderWithProviders(<LessonPreview data={previewPayload()} />)

    expect(screen.getByRole('heading', { name: 'One operation, both sides' })).toBeInTheDocument()
    expect(screen.getByText(/a claim that two things are equal/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Two-step equations' })).toBeInTheDocument()
  })

  it('names a block it cannot show instead of rendering a short lesson', () => {
    renderWithProviders(<LessonPreview data={previewPayload()} />)

    expect(screen.getByText(/part of this lesson is missing/i)).toBeInTheDocument()
    expect(screen.getByText(/a table, in a shape this app cannot read/i)).toBeInTheDocument()
  })

  it('offers no submission, with the reason beside the action', () => {
    renderWithProviders(<LessonPreview data={previewPayload()} />)

    const send = screen.getByRole('button', { name: 'Send my answers' })

    expect(send).toBeDisabled()
    expect(send).toHaveAccessibleDescription(/not saved to the workspace yet/i)
  })

  it('says so when the generated lesson cannot be read at all', () => {
    renderWithProviders(
      <LessonPreview
        data={{ lesson: { title: 'Two-step equations' }, terms: {}, resources: {} }}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent(/could not be shown/i)
    expect(screen.queryByRole('button', { name: 'Send my answers' })).not.toBeInTheDocument()
  })
})
