import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { renderWithProviders, screen } from '@/test/test-utils'

import { ExampleForm } from './example-form'

describe('ExampleForm', () => {
  it('validates and submits form values', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    renderWithProviders(<ExampleForm onSubmit={onSubmit} />)

    await user.click(screen.getByRole('button', { name: 'Submit' }))
    expect(screen.getByText('Name is required')).toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Demo')
    await user.click(screen.getByRole('button', { name: 'Submit' }))

    // React Hook Form calls onSubmit(values, event).
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({ name: 'Demo' })
  })
})
