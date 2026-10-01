import { describe, expect, it } from 'vitest'

import { renderWithProviders, screen } from '@/test/test-utils'

import { EmptyState } from './empty-state'

describe('EmptyState', () => {
  it('renders its title and description', () => {
    renderWithProviders(
      <EmptyState title="No projects" description="Create your first project to get started." />,
    )

    expect(screen.getByRole('heading', { name: 'No projects' })).toBeInTheDocument()
    expect(screen.getByText('Create your first project to get started.')).toBeInTheDocument()
  })
})
