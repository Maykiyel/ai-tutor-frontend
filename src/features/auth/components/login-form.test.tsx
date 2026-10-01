import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { renderWithProviders, screen } from '@/test/test-utils'

import { LoginForm } from './login-form'

describe('LoginForm', () => {
  it('blocks submission and shows errors when fields are empty', async () => {
    const user = userEvent.setup()

    renderWithProviders(<LoginForm onSubmit={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(screen.getByText('Username is required')).toBeInTheDocument()
    expect(screen.getByText('Password is required')).toBeInTheDocument()
  })

  it('submits the entered credentials', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    renderWithProviders(<LoginForm onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('Username'), 'ada')
    await user.type(screen.getByLabelText('Password'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    // React Hook Form calls onSubmit(values, event).
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({
      username: 'ada',
      password: 'secret123',
    })
  })

  it('shows a loading state while submitting', async () => {
    renderWithProviders(<LoginForm onSubmit={vi.fn()} isSubmitting />)

    expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled()
  })
})
