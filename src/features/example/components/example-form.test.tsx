import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ExampleForm } from './example-form'

describe('ExampleForm', () => {
  it('validates and submits form values', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(<ExampleForm onSubmit={onSubmit} />)

    await user.click(screen.getByRole('button', { name: 'Submit' }))
    expect(screen.getByText('Name is required')).toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Demo')
    await user.click(screen.getByRole('button', { name: 'Submit' }))

    expect(onSubmit).toHaveBeenCalledWith({ name: 'Demo' })
  })
})
