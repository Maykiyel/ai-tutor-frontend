import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { renderWithProviders, screen } from '@/test/test-utils'

import { RegisterForm } from './register-form'

describe('RegisterForm', () => {
  it('enforces the username length rules', async () => {
    const user = userEvent.setup()

    renderWithProviders(<RegisterForm onSubmit={vi.fn()} />)

    await user.type(screen.getByLabelText('Username'), 'ab')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(screen.getByText('Username must be at least 3 characters')).toBeInTheDocument()
  })

  it('rejects mismatched password confirmation', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    renderWithProviders(<RegisterForm onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('Username'), 'ada')
    await user.type(screen.getByLabelText('Password', { exact: true }), 'secret123')
    await user.type(screen.getByLabelText('Confirm password'), 'different')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits matching values', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    renderWithProviders(<RegisterForm onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('Username'), 'ada')
    await user.type(screen.getByLabelText('Password', { exact: true }), 'secret123')
    await user.type(screen.getByLabelText('Confirm password'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(onSubmit.mock.calls[0]?.[0]).toEqual({
      username: 'ada',
      password: 'secret123',
      password_confirmation: 'secret123',
    })
  })
})
