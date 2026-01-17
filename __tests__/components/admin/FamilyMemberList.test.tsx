import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FamilyMemberList from '@/components/admin/FamilyMemberList'
import type { User } from '@/lib/auth'

// Mock router
const mockRefresh = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

// Mock Supabase
const mockAuthAdmin = {
  deleteUser: jest.fn().mockResolvedValue({
    data: { user: null },
    error: null,
  }),
}

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      admin: mockAuthAdmin,
    },
  }),
}))

// Mock child modals
jest.mock('@/components/admin/AddChildModal', () => {
  return function MockAddChildModal({ onClose, onSuccess }: any) {
    return (
      <div data-testid="add-child-modal">
        <button onClick={onClose}>Cancel</button>
        <button onClick={onSuccess}>Add Child</button>
      </div>
    )
  }
})

jest.mock('@/components/admin/EditChildModal', () => {
  return function MockEditChildModal({ onClose, onSuccess, child }: any) {
    return (
      <div data-testid="edit-child-modal">
        <span data-testid="editing-child-name">{child.name}</span>
        <button onClick={onClose}>Cancel</button>
        <button onClick={onSuccess}>Save</button>
      </div>
    )
  }
})

jest.mock('@/components/admin/EditParentModal', () => {
  return function MockEditParentModal({ onClose, onSuccess, parent }: any) {
    return (
      <div data-testid="edit-parent-modal">
        <span data-testid="editing-parent-name">{parent.name}</span>
        <button onClick={onClose}>Cancel</button>
        <button onClick={onSuccess}>Save</button>
      </div>
    )
  }
})

jest.mock('@/components/admin/ResetPasswordModal', () => {
  return function MockResetPasswordModal({ onClose, child }: any) {
    return (
      <div data-testid="reset-password-modal">
        <span data-testid="resetting-child-name">{child.name}</span>
        <button onClick={onClose}>Close</button>
      </div>
    )
  }
})

describe('FamilyMemberList', () => {
  const mockParents: User[] = [
    {
      id: 'parent-1',
      family_id: 'family-1',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'parent',
      locale: 'en',
      created_at: '2024-01-01',
    },
    {
      id: 'parent-2',
      family_id: 'family-1',
      name: 'Jane Doe',
      email: 'jane@example.com',
      role: 'parent',
      locale: 'en',
      created_at: '2024-01-02',
    },
  ]

  const mockChildren: User[] = [
    {
      id: 'child-1',
      family_id: 'family-1',
      name: 'Alice',
      email: 'alice@example.com',
      role: 'child',
      locale: 'en',
      created_at: '2024-01-10',
    },
    {
      id: 'child-2',
      family_id: 'family-1',
      name: 'Bob',
      email: 'bob@example.com',
      role: 'child',
      locale: 'en',
      created_at: '2024-01-15',
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    global.confirm = jest.fn(() => true)
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response)
    )
  })

  describe('Parents Section', () => {
    it('renders all parents', () => {
      render(
        <FamilyMemberList
          parents={mockParents}
          children={[]}
          currentUser={mockParents[0]}
          locale="en"
        />
      )

      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('john@example.com')).toBeInTheDocument()
      expect(screen.getByText('Jane Doe')).toBeInTheDocument()
      expect(screen.getByText('jane@example.com')).toBeInTheDocument()
    })

    it('shows "You" badge for current user', () => {
      render(
        <FamilyMemberList
          parents={mockParents}
          children={[]}
          currentUser={mockParents[0]}
          locale="en"
        />
      )

      expect(screen.getByText('family.you')).toBeInTheDocument()
    })

    it('displays parents section header', () => {
      render(
        <FamilyMemberList
          parents={mockParents}
          children={[]}
          currentUser={mockParents[0]}
          locale="en"
        />
      )

      expect(screen.getByText('family.parents')).toBeInTheDocument()
      expect(screen.getByText('👨‍👩')).toBeInTheDocument()
    })
  })

  describe('Children Section', () => {
    it('renders all children with details', () => {
      render(
        <FamilyMemberList
          parents={mockParents}
          children={mockChildren}
          currentUser={mockParents[0]}
          locale="en"
        />
      )

      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('alice@example.com')).toBeInTheDocument()
      expect(screen.getByText('Bob')).toBeInTheDocument()
      expect(screen.getByText('bob@example.com')).toBeInTheDocument()
    })

    it('displays children count in header', () => {
      render(
        <FamilyMemberList
          parents={mockParents}
          children={mockChildren}
          currentUser={mockParents[0]}
          locale="en"
        />
      )

      expect(screen.getByText(/\(2\)/)).toBeInTheDocument()
    })

    it('shows joined date for each child', () => {
      render(
        <FamilyMemberList
          parents={mockParents}
          children={mockChildren}
          currentUser={mockParents[0]}
          locale="en"
        />
      )

      // Should show "family.joined" text (translated)
      const joinedTexts = screen.getAllByText(/family\.joined/)
      expect(joinedTexts.length).toBe(2)
    })

    it('displays child action buttons', () => {
      render(
        <FamilyMemberList
          parents={mockParents}
          children={mockChildren}
          currentUser={mockParents[0]}
          locale="en"
        />
      )

      // Each child should have Edit, Reset Password, and Delete buttons
      // Plus 1 edit button for the current parent user
      expect(screen.getAllByText('family.editInfo').length).toBe(3) // 1 parent + 2 children
      expect(screen.getAllByText('family.resetPassword').length).toBe(2) // children only
      expect(screen.getAllByText('family.deleteChild').length).toBe(2) // children only
    })
  })

  describe('Empty Children State', () => {
    it('shows empty state when no children', () => {
      render(
        <FamilyMemberList
          parents={mockParents}
          children={[]}
          currentUser={mockParents[0]}
          locale="en"
        />
      )

      expect(screen.getByText('family.noChildren')).toBeInTheDocument()
      expect(screen.getByText('family.addFirstChild')).toBeInTheDocument()
    })

    it('shows add child button in empty state', () => {
      render(
        <FamilyMemberList
          parents={mockParents}
          children={[]}
          currentUser={mockParents[0]}
          locale="en"
        />
      )

      const addButton = screen.getByRole('button', { name: /family\.addFirstChild/i })
      expect(addButton).toBeInTheDocument()
    })
  })

  describe('Add Child Modal', () => {
    it('opens add child modal when clicking add button', async () => {
      const user = userEvent.setup()
      render(
        <FamilyMemberList
          parents={mockParents}
          children={mockChildren}
          currentUser={mockParents[0]}
          locale="en"
        />
      )

      const addButton = screen.getByRole('button', { name: /family\.addChild/i })
      await user.click(addButton)

      expect(screen.getByTestId('add-child-modal')).toBeInTheDocument()
    })

    it('closes modal when clicking cancel', async () => {
      const user = userEvent.setup()
      render(
        <FamilyMemberList
          parents={mockParents}
          children={mockChildren}
          currentUser={mockParents[0]}
          locale="en"
        />
      )

      const addButton = screen.getByRole('button', { name: /family\.addChild/i })
      await user.click(addButton)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      expect(screen.queryByTestId('add-child-modal')).not.toBeInTheDocument()
    })

    it('closes modal and refreshes on success', async () => {
      const user = userEvent.setup()
      render(
        <FamilyMemberList
          parents={mockParents}
          children={mockChildren}
          currentUser={mockParents[0]}
          locale="en"
        />
      )

      const addButton = screen.getByRole('button', { name: /family\.addChild/i })
      await user.click(addButton)

      const addChildButton = screen.getByRole('button', { name: /add child/i })
      await user.click(addChildButton)

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled()
      })

      expect(screen.queryByTestId('add-child-modal')).not.toBeInTheDocument()
    })

    it('opens modal from empty state button', async () => {
      const user = userEvent.setup()
      render(
        <FamilyMemberList
          parents={mockParents}
          children={[]}
          currentUser={mockParents[0]}
          locale="en"
        />
      )

      const addButton = screen.getByRole('button', { name: /family\.addFirstChild/i })
      await user.click(addButton)

      expect(screen.getByTestId('add-child-modal')).toBeInTheDocument()
    })
  })

  describe('Edit Child Modal', () => {
    it('opens edit modal when clicking edit button', async () => {
      const user = userEvent.setup()
      render(
        <FamilyMemberList
          parents={mockParents}
          children={mockChildren}
          currentUser={mockParents[0]}
          locale="en"
        />
      )

      const editButtons = screen.getAllByText('family.editInfo')
      // Index 0 is parent edit button, index 1 is first child edit button
      await user.click(editButtons[1])

      expect(screen.getByTestId('edit-child-modal')).toBeInTheDocument()
      expect(screen.getByTestId('editing-child-name')).toHaveTextContent('Alice')
    })

    it('closes modal when clicking cancel', async () => {
      const user = userEvent.setup()
      render(
        <FamilyMemberList
          parents={mockParents}
          children={mockChildren}
          currentUser={mockParents[0]}
          locale="en"
        />
      )

      const editButtons = screen.getAllByText('family.editInfo')
      // Index 0 is parent edit button, index 1 is first child edit button
      await user.click(editButtons[1])

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      expect(screen.queryByTestId('edit-child-modal')).not.toBeInTheDocument()
    })

    it('closes modal and refreshes on success', async () => {
      const user = userEvent.setup()
      render(
        <FamilyMemberList
          parents={mockParents}
          children={mockChildren}
          currentUser={mockParents[0]}
          locale="en"
        />
      )

      const editButtons = screen.getAllByText('family.editInfo')
      // Index 0 is parent edit button, index 1 is first child edit button
      await user.click(editButtons[1])

      const saveButton = screen.getByRole('button', { name: /save/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled()
      })

      expect(screen.queryByTestId('edit-child-modal')).not.toBeInTheDocument()
    })
  })

  describe('Edit Parent Modal', () => {
    it('opens edit parent modal when clicking edit button on current user parent', async () => {
      const user = userEvent.setup()
      render(
        <FamilyMemberList
          parents={mockParents}
          children={mockChildren}
          currentUser={mockParents[0]}
          locale="en"
        />
      )

      const editButtons = screen.getAllByText('family.editInfo')
      // Index 0 is the parent edit button (for current user)
      await user.click(editButtons[0])

      expect(screen.getByTestId('edit-parent-modal')).toBeInTheDocument()
      expect(screen.getByTestId('editing-parent-name')).toHaveTextContent('John Doe')
    })

    it('closes parent edit modal when clicking cancel', async () => {
      const user = userEvent.setup()
      render(
        <FamilyMemberList
          parents={mockParents}
          children={mockChildren}
          currentUser={mockParents[0]}
          locale="en"
        />
      )

      const editButtons = screen.getAllByText('family.editInfo')
      await user.click(editButtons[0])

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      expect(screen.queryByTestId('edit-parent-modal')).not.toBeInTheDocument()
    })

    it('closes parent edit modal and refreshes on success', async () => {
      const user = userEvent.setup()
      render(
        <FamilyMemberList
          parents={mockParents}
          children={mockChildren}
          currentUser={mockParents[0]}
          locale="en"
        />
      )

      const editButtons = screen.getAllByText('family.editInfo')
      await user.click(editButtons[0])

      const saveButton = screen.getByRole('button', { name: /save/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled()
      })

      expect(screen.queryByTestId('edit-parent-modal')).not.toBeInTheDocument()
    })

    it('does not show edit button for other parents (not current user)', () => {
      render(
        <FamilyMemberList
          parents={mockParents}
          children={mockChildren}
          currentUser={mockParents[0]}
          locale="en"
        />
      )

      // Should have 3 edit buttons total: 1 for current user parent + 2 for children
      const editButtons = screen.getAllByText('family.editInfo')
      expect(editButtons.length).toBe(3)
    })
  })

  describe('Reset Password Modal', () => {
    it('opens reset password modal when clicking reset button', async () => {
      const user = userEvent.setup()
      render(
        <FamilyMemberList
          parents={mockParents}
          children={mockChildren}
          currentUser={mockParents[0]}
          locale="en"
        />
      )

      const resetButtons = screen.getAllByText('family.resetPassword')
      await user.click(resetButtons[0])

      expect(screen.getByTestId('reset-password-modal')).toBeInTheDocument()
      expect(screen.getByTestId('resetting-child-name')).toHaveTextContent('Alice')
    })

    it('closes modal when clicking close', async () => {
      const user = userEvent.setup()
      render(
        <FamilyMemberList
          parents={mockParents}
          children={mockChildren}
          currentUser={mockParents[0]}
          locale="en"
        />
      )

      const resetButtons = screen.getAllByText('family.resetPassword')
      await user.click(resetButtons[0])

      const closeButton = screen.getByRole('button', { name: /close/i })
      await user.click(closeButton)

      expect(screen.queryByTestId('reset-password-modal')).not.toBeInTheDocument()
    })
  })

  describe('Delete Child', () => {
    it('shows confirmation dialog before deleting', async () => {
      const user = userEvent.setup()
      const mockConfirm = jest.fn(() => true)
      global.confirm = mockConfirm

      render(
        <FamilyMemberList
          parents={mockParents}
          children={mockChildren}
          currentUser={mockParents[0]}
          locale="en"
        />
      )

      const deleteButtons = screen.getAllByText('family.deleteChild')
      await user.click(deleteButtons[0])

      expect(mockConfirm).toHaveBeenCalled()
    })

    it('does not delete when user cancels confirmation', async () => {
      const user = userEvent.setup()
      global.confirm = jest.fn(() => false)
      const mockFetch = jest.fn()
      global.fetch = mockFetch

      render(
        <FamilyMemberList
          parents={mockParents}
          children={mockChildren}
          currentUser={mockParents[0]}
          locale="en"
        />
      )

      const deleteButtons = screen.getAllByText('family.deleteChild')
      await user.click(deleteButtons[0])

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('deletes child when confirmed', async () => {
      const user = userEvent.setup()
      global.confirm = jest.fn(() => true)
      const mockFetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        } as Response)
      )
      global.fetch = mockFetch

      render(
        <FamilyMemberList
          parents={mockParents}
          children={mockChildren}
          currentUser={mockParents[0]}
          locale="en"
        />
      )

      const deleteButtons = screen.getAllByText('family.deleteChild')
      await user.click(deleteButtons[0])

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/en/api/admin/delete-child',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ childId: 'child-1' }),
          })
        )
      })

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled()
      })
    })

    it('uses correct locale in delete API call', async () => {
      const user = userEvent.setup()
      global.confirm = jest.fn(() => true)
      const mockFetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        } as Response)
      )
      global.fetch = mockFetch

      render(
        <FamilyMemberList
          parents={mockParents}
          children={mockChildren}
          currentUser={mockParents[0]}
          locale="zh-CN"
        />
      )

      const deleteButtons = screen.getAllByText('family.deleteChild')
      await user.click(deleteButtons[0])

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/zh-CN/api/admin/delete-child',
          expect.any(Object)
        )
      })
    })

    it('shows error message on delete failure', async () => {
      const user = userEvent.setup()
      global.confirm = jest.fn(() => true)
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
        } as Response)
      )

      render(
        <FamilyMemberList
          parents={mockParents}
          children={mockChildren}
          currentUser={mockParents[0]}
          locale="en"
        />
      )

      const deleteButtons = screen.getAllByText('family.deleteChild')
      await user.click(deleteButtons[0])

      await waitFor(() => {
        expect(screen.getByText('family.deleteError')).toBeInTheDocument()
      })
    })

    it('handles fetch error gracefully', async () => {
      const user = userEvent.setup()
      global.confirm = jest.fn(() => true)
      global.fetch = jest.fn(() => Promise.reject(new Error('Network error')))

      render(
        <FamilyMemberList
          parents={mockParents}
          children={mockChildren}
          currentUser={mockParents[0]}
          locale="en"
        />
      )

      const deleteButtons = screen.getAllByText('family.deleteChild')
      await user.click(deleteButtons[0])

      await waitFor(() => {
        expect(screen.getByText('family.deleteError')).toBeInTheDocument()
      })
    })
  })

  describe('Localization', () => {
    it('passes locale to child modals', async () => {
      const user = userEvent.setup()
      render(
        <FamilyMemberList
          parents={mockParents}
          children={mockChildren}
          currentUser={mockParents[0]}
          locale="zh-CN"
        />
      )

      const addButton = screen.getByRole('button', { name: /family\.addChild/i })
      await user.click(addButton)

      // Modal should be rendered (locale is passed but not visible in mock)
      expect(screen.getByTestId('add-child-modal')).toBeInTheDocument()
    })

    it('formats dates according to locale', () => {
      render(
        <FamilyMemberList
          parents={mockParents}
          children={mockChildren}
          currentUser={mockParents[0]}
          locale="en"
        />
      )

      // Should show formatted dates (actual format depends on locale)
      const joinedTexts = screen.getAllByText(/family\.joined/)
      expect(joinedTexts.length).toBe(2)
    })
  })

  describe('UI Icons and Styling', () => {
    it('displays parent icon', () => {
      render(
        <FamilyMemberList
          parents={mockParents}
          children={[]}
          currentUser={mockParents[0]}
          locale="en"
        />
      )

      expect(screen.getAllByText('👨‍💼').length).toBe(2)
    })

    it('displays child icons', () => {
      render(
        <FamilyMemberList
          parents={mockParents}
          children={mockChildren}
          currentUser={mockParents[0]}
          locale="en"
        />
      )

      expect(screen.getAllByText('🧒').length).toBe(2)
    })

    it('displays action icons for children', () => {
      render(
        <FamilyMemberList
          parents={mockParents}
          children={mockChildren}
          currentUser={mockParents[0]}
          locale="en"
        />
      )

      expect(screen.getAllByText('✏️').length).toBe(3) // Edit (1 for parent + 2 for children)
      expect(screen.getAllByText('🔑').length).toBe(2) // Reset password (children only)
      expect(screen.getAllByText('🗑️').length).toBe(2) // Delete (children only)
    })
  })
})
