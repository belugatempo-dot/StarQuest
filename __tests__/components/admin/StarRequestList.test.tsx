import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StarRequestList from '@/components/admin/StarRequestList'

// Mock router
const mockRefresh = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

// Mock Supabase
const mockUpdate = jest.fn()
const mockFrom = jest.fn()

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}))

describe('StarRequestList', () => {
  const mockRequests = [
    {
      id: 'request-1',
      stars: 5,
      child_note: 'I helped mom cook dinner',
      created_at: '2024-01-15T10:30:00Z',
      users: {
        name: 'Alice',
        avatar_url: null,
      },
      quests: {
        name_en: 'Help Cook',
        name_zh: '帮忙做饭',
        icon: '👨‍🍳',
        category: 'chores',
      },
    },
    {
      id: 'request-2',
      stars: 3,
      child_note: null,
      created_at: '2024-01-15T11:00:00Z',
      users: {
        name: 'Bob',
        avatar_url: '😊',
      },
      quests: {
        name_en: 'Clean Room',
        name_zh: '打扫房间',
        icon: '🧹',
        category: 'hygiene',
      },
    },
    {
      id: 'request-3',
      stars: 2,
      child_note: 'Custom task',
      created_at: '2024-01-15T12:00:00Z',
      users: {
        name: 'Charlie',
        avatar_url: null,
      },
      quests: null,
      custom_description: 'Special task',
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    global.alert = jest.fn()

    mockFrom.mockReturnValue({
      update: mockUpdate.mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null }),
    })
  })

  describe('Empty State', () => {
    it('shows empty state when no requests', () => {
      render(
        <StarRequestList requests={[]} locale="en" parentId="parent-1" />
      )

      expect(screen.getByText('✅')).toBeInTheDocument()
      expect(screen.getByText('admin.noRequests')).toBeInTheDocument()
      expect(screen.getByText(/all caught up/i)).toBeInTheDocument()
    })

    it('shows message about new requests appearing', () => {
      render(
        <StarRequestList requests={[]} locale="en" parentId="parent-1" />
      )

      expect(screen.getByText(/new requests will appear here/i)).toBeInTheDocument()
    })
  })

  describe('Request Display', () => {
    it('renders all requests', () => {
      render(
        <StarRequestList
          requests={mockRequests}
          locale="en"
          parentId="parent-1"
        />
      )

      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('Bob')).toBeInTheDocument()
      expect(screen.getByText('Charlie')).toBeInTheDocument()
    })

    it('displays quest names in English', () => {
      render(
        <StarRequestList
          requests={mockRequests}
          locale="en"
          parentId="parent-1"
        />
      )

      expect(screen.getByText('Help Cook')).toBeInTheDocument()
      expect(screen.getByText('Clean Room')).toBeInTheDocument()
    })

    it('displays quest names in Chinese', () => {
      render(
        <StarRequestList
          requests={mockRequests}
          locale="zh-CN"
          parentId="parent-1"
        />
      )

      expect(screen.getByText('帮忙做饭')).toBeInTheDocument()
      expect(screen.getByText('打扫房间')).toBeInTheDocument()
    })

    it('falls back to English name if Chinese not available', () => {
      const requestWithoutChinese = [
        {
          ...mockRequests[0],
          quests: {
            ...mockRequests[0].quests,
            name_zh: null,
          },
        },
      ]

      render(
        <StarRequestList
          requests={requestWithoutChinese}
          locale="zh-CN"
          parentId="parent-1"
        />
      )

      expect(screen.getByText('Help Cook')).toBeInTheDocument()
    })

    it('displays custom description for requests without quests', () => {
      render(
        <StarRequestList
          requests={mockRequests}
          locale="en"
          parentId="parent-1"
        />
      )

      expect(screen.getByText('Special task')).toBeInTheDocument()
    })

    it('displays quest icons', () => {
      render(
        <StarRequestList
          requests={mockRequests}
          locale="en"
          parentId="parent-1"
        />
      )

      expect(screen.getByText('👨‍🍳')).toBeInTheDocument()
      expect(screen.getByText('🧹')).toBeInTheDocument()
    })

    it('displays default icon for requests without quest icon', () => {
      render(
        <StarRequestList
          requests={mockRequests}
          locale="en"
          parentId="parent-1"
        />
      )

      // Should have at least one ⭐ icon
      expect(screen.getByText('⭐')).toBeInTheDocument()
    })

    it('displays star amounts', () => {
      render(
        <StarRequestList
          requests={mockRequests}
          locale="en"
          parentId="parent-1"
        />
      )

      expect(screen.getByText('+5')).toBeInTheDocument()
      expect(screen.getByText('+3')).toBeInTheDocument()
      expect(screen.getByText('+2')).toBeInTheDocument()
    })

    it('displays child notes when present', () => {
      render(
        <StarRequestList
          requests={mockRequests}
          locale="en"
          parentId="parent-1"
        />
      )

      expect(screen.getByText(/"I helped mom cook dinner"/i)).toBeInTheDocument()
      expect(screen.getByText(/"Custom task"/i)).toBeInTheDocument()
    })

    it('does not display note section when child_note is null', () => {
      const { container } = render(
        <StarRequestList
          requests={mockRequests}
          locale="en"
          parentId="parent-1"
        />
      )

      // Request 2 has no note, so there should be only 2 note sections
      const noteElements = container.querySelectorAll('.bg-blue-50')
      expect(noteElements.length).toBe(2)
    })

    it('displays user avatar when available', () => {
      render(
        <StarRequestList
          requests={mockRequests}
          locale="en"
          parentId="parent-1"
        />
      )

      expect(screen.getByText('😊')).toBeInTheDocument()
    })

    it('displays default avatar when not available', () => {
      render(
        <StarRequestList
          requests={mockRequests}
          locale="en"
          parentId="parent-1"
        />
      )

      expect(screen.getAllByText('👤').length).toBeGreaterThan(0)
    })

    it('displays formatted dates', () => {
      render(
        <StarRequestList
          requests={mockRequests}
          locale="en"
          parentId="parent-1"
        />
      )

      // Should display formatted dates (format varies by locale)
      // Just check that some date-like text is present
      const dateElements = screen.getAllByText(/2024|Jan|15/i)
      expect(dateElements.length).toBeGreaterThan(0)
    })
  })

  describe('Approve Request', () => {
    it('calls update with correct data when approving', async () => {
      const user = userEvent.setup()
      render(
        <StarRequestList
          requests={mockRequests}
          locale="en"
          parentId="parent-1"
        />
      )

      const approveButtons = screen.getAllByRole('button', {
        name: /admin\.approve/i,
      })
      await user.click(approveButtons[0])

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'approved',
            reviewed_by: 'parent-1',
          })
        )
      })
    })

    it('refreshes page after successful approval', async () => {
      const user = userEvent.setup()
      render(
        <StarRequestList
          requests={mockRequests}
          locale="en"
          parentId="parent-1"
        />
      )

      const approveButtons = screen.getAllByRole('button', {
        name: /admin\.approve/i,
      })
      await user.click(approveButtons[0])

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled()
      })
    })

    it('shows processing state while approving', async () => {
      const user = userEvent.setup()
      mockFrom.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockImplementation(
          () => new Promise(() => {}) // Never resolves
        ),
      })

      render(
        <StarRequestList
          requests={mockRequests}
          locale="en"
          parentId="parent-1"
        />
      )

      const approveButtons = screen.getAllByRole('button', {
        name: /admin\.approve/i,
      })
      await user.click(approveButtons[0])

      await waitFor(() => {
        expect(screen.getByText('admin.processing')).toBeInTheDocument()
      })
    })

    it('disables buttons while processing', async () => {
      const user = userEvent.setup()
      mockFrom.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockImplementation(
          () => new Promise(() => {}) // Never resolves
        ),
      })

      render(
        <StarRequestList
          requests={mockRequests}
          locale="en"
          parentId="parent-1"
        />
      )

      const approveButtons = screen.getAllByRole('button', {
        name: /admin\.approve/i,
      })
      await user.click(approveButtons[0])

      await waitFor(() => {
        const processingButton = screen.getByRole('button', {
          name: /admin\.processing/i,
        })
        expect(processingButton).toBeDisabled()
      })
    })

    it('shows alert on approval error', async () => {
      const user = userEvent.setup()
      const mockAlert = jest.fn()
      global.alert = mockAlert

      mockFrom.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: { message: 'Database error' },
        }),
      })

      render(
        <StarRequestList
          requests={mockRequests}
          locale="en"
          parentId="parent-1"
        />
      )

      const approveButtons = screen.getAllByRole('button', {
        name: /admin\.approve/i,
      })
      await user.click(approveButtons[0])

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Failed to approve request')
      })
    })
  })

  describe('Reject Request', () => {
    it('opens reject modal when clicking reject button', async () => {
      const user = userEvent.setup()
      render(
        <StarRequestList
          requests={mockRequests}
          locale="en"
          parentId="parent-1"
        />
      )

      const rejectButtons = screen.getAllByRole('button', {
        name: /^admin\.reject$/i,
      })
      await user.click(rejectButtons[0])

      expect(screen.getByText('admin.rejectReason')).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/explain why/i)).toBeInTheDocument()
    })

    it('closes modal when clicking cancel', async () => {
      const user = userEvent.setup()
      render(
        <StarRequestList
          requests={mockRequests}
          locale="en"
          parentId="parent-1"
        />
      )

      const rejectButtons = screen.getAllByRole('button', {
        name: /^admin\.reject$/i,
      })
      await user.click(rejectButtons[0])

      const cancelButton = screen.getByRole('button', { name: /common\.cancel/i })
      await user.click(cancelButton)

      expect(screen.queryByText('admin.rejectReason')).not.toBeInTheDocument()
    })

    it('clears reject reason when closing modal', async () => {
      const user = userEvent.setup()
      render(
        <StarRequestList
          requests={mockRequests}
          locale="en"
          parentId="parent-1"
        />
      )

      const rejectButtons = screen.getAllByRole('button', {
        name: /^admin\.reject$/i,
      })
      await user.click(rejectButtons[0])

      const textarea = screen.getByPlaceholderText(/explain why/i)
      await user.type(textarea, 'Test reason')

      const cancelButton = screen.getByRole('button', { name: /common\.cancel/i })
      await user.click(cancelButton)

      // Open modal again
      await user.click(rejectButtons[0])

      const newTextarea = screen.getByPlaceholderText(/explain why/i)
      expect(newTextarea).toHaveValue('')
    })

    it('requires rejection reason', async () => {
      const user = userEvent.setup()

      render(
        <StarRequestList
          requests={mockRequests}
          locale="en"
          parentId="parent-1"
        />
      )

      const rejectButtons = screen.getAllByRole('button', {
        name: /^admin\.reject$/i,
      })
      await user.click(rejectButtons[0])

      // In the modal, find button by container - modal has bg-white and p-6
      const modal = screen.getByRole('heading', { name: /admin\.rejectReason/i }).closest('div')
      const buttons = within(modal!).getAllByRole('button')
      const modalRejectButton = buttons.find((btn) => btn.className.includes('bg-danger'))

      expect(modalRejectButton).toBeDisabled()
    })

    it('disables reject button when reason is empty', async () => {
      const user = userEvent.setup()
      render(
        <StarRequestList
          requests={mockRequests}
          locale="en"
          parentId="parent-1"
        />
      )

      const rejectButtons = screen.getAllByRole('button', {
        name: /^admin\.reject$/i,
      })
      await user.click(rejectButtons[0])

      // Find the modal and then the reject button within it
      const modal = screen.getByRole('heading', { name: /admin\.rejectReason/i }).closest('div')
      const buttons = within(modal!).getAllByRole('button')
      const modalRejectButton = buttons.find((btn) => btn.className.includes('bg-danger'))

      expect(modalRejectButton).toBeDisabled()
    })

    it('enables reject button when reason is provided', async () => {
      const user = userEvent.setup()
      render(
        <StarRequestList
          requests={mockRequests}
          locale="en"
          parentId="parent-1"
        />
      )

      const rejectButtons = screen.getAllByRole('button', {
        name: /^admin\.reject$/i,
      })
      await user.click(rejectButtons[0])

      const textarea = screen.getByPlaceholderText(/explain why/i)
      await user.type(textarea, 'Not completed properly')

      const modal = screen.getByRole('heading', { name: /admin\.rejectReason/i }).closest('div')
      const buttons = within(modal!).getAllByRole('button')
      const modalRejectButton = buttons.find((btn) => btn.className.includes('bg-danger'))

      expect(modalRejectButton).not.toBeDisabled()
    })

    it('calls update with correct data when rejecting', async () => {
      const user = userEvent.setup()
      render(
        <StarRequestList
          requests={mockRequests}
          locale="en"
          parentId="parent-1"
        />
      )

      const rejectButtons = screen.getAllByRole('button', {
        name: /^admin\.reject$/i,
      })
      await user.click(rejectButtons[0])

      const textarea = screen.getByPlaceholderText(/explain why/i)
      await user.type(textarea, 'Task not done well')

      const modal = screen.getByRole('heading', { name: /admin\.rejectReason/i }).closest('div')
      const buttons = within(modal!).getAllByRole('button')
      const modalRejectButton = buttons.find((btn) => btn.className.includes('bg-danger'))
      await user.click(modalRejectButton!)

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'rejected',
            parent_response: 'Task not done well',
            reviewed_by: 'parent-1',
          })
        )
      })
    })

    it('closes modal and refreshes after successful rejection', async () => {
      const user = userEvent.setup()
      render(
        <StarRequestList
          requests={mockRequests}
          locale="en"
          parentId="parent-1"
        />
      )

      const rejectButtons = screen.getAllByRole('button', {
        name: /^admin\.reject$/i,
      })
      await user.click(rejectButtons[0])

      const textarea = screen.getByPlaceholderText(/explain why/i)
      await user.type(textarea, 'Not good enough')

      const modal = screen.getByRole('heading', { name: /admin\.rejectReason/i }).closest('div')
      const buttons = within(modal!).getAllByRole('button')
      const modalRejectButton = buttons.find((btn) => btn.className.includes('bg-danger'))
      await user.click(modalRejectButton!)

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled()
      })

      expect(screen.queryByText('admin.rejectReason')).not.toBeInTheDocument()
    })

    it('shows alert on rejection error', async () => {
      const user = userEvent.setup()
      const mockAlert = jest.fn()
      global.alert = mockAlert

      // Create new mocks for this specific test
      const mockUpdateError = jest.fn().mockReturnThis()
      const mockEqError = jest.fn().mockResolvedValue({
        error: { message: 'Database error' },
      })

      mockFrom.mockReturnValue({
        update: mockUpdateError,
        eq: mockEqError,
      })

      render(
        <StarRequestList
          requests={mockRequests}
          locale="en"
          parentId="parent-1"
        />
      )

      const rejectButtons = screen.getAllByRole('button', {
        name: /^admin\.reject$/i,
      })
      await user.click(rejectButtons[0])

      const textarea = screen.getByPlaceholderText(/explain why/i)
      await user.type(textarea, 'Test reason')

      const modal = screen.getByRole('heading', { name: /admin\.rejectReason/i }).closest('div')
      const buttons = within(modal!).getAllByRole('button')
      const modalRejectButton = buttons.find((btn) => btn.className.includes('bg-danger'))
      await user.click(modalRejectButton!)

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Failed to reject request')
      })
    })

    it('shows textarea in reject modal', async () => {
      const user = userEvent.setup()
      render(
        <StarRequestList
          requests={mockRequests}
          locale="en"
          parentId="parent-1"
        />
      )

      const rejectButtons = screen.getAllByRole('button', {
        name: /^admin\.reject$/i,
      })
      await user.click(rejectButtons[0])

      const textarea = screen.getByPlaceholderText(/explain why/i)
      expect(textarea).toBeInTheDocument()
      expect(textarea.tagName).toBe('TEXTAREA')
      expect(textarea).toHaveAttribute('rows', '4')
    })
  })

  describe('Quest Categories', () => {
    it('displays quest category translation', () => {
      render(
        <StarRequestList
          requests={mockRequests}
          locale="en"
          parentId="parent-1"
        />
      )

      expect(screen.getByText('quests.category.chores')).toBeInTheDocument()
      expect(screen.getByText('quests.category.hygiene')).toBeInTheDocument()
    })

    it('does not display category for custom requests', () => {
      const { container } = render(
        <StarRequestList
          requests={mockRequests}
          locale="en"
          parentId="parent-1"
        />
      )

      // Request 3 has no quest, so should have 2 categories
      const categoryElements = container.querySelectorAll('.text-xs.text-gray-500')
      expect(categoryElements.length).toBe(2)
    })
  })
})
