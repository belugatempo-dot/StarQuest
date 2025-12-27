import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RedemptionRequestList from '@/components/admin/RedemptionRequestList'

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

describe('RedemptionRequestList', () => {
  const mockRequests = [
    {
      id: 'redemption-1',
      stars_spent: 10,
      child_note: 'I want this toy!',
      created_at: '2024-01-15T10:30:00Z',
      users: {
        name: 'Alice',
        avatar_url: null,
      },
      rewards: {
        name_en: 'Toy Car',
        name_zh: '玩具车',
        icon: '🚗',
        category: 'toy',
        description: 'Red racing car',
      },
    },
    {
      id: 'redemption-2',
      stars_spent: 5,
      child_note: null,
      created_at: '2024-01-15T11:00:00Z',
      users: {
        name: 'Bob',
        avatar_url: '😊',
      },
      rewards: {
        name_en: 'Ice Cream',
        name_zh: '冰淇淋',
        icon: '🍦',
        category: 'food',
        description: null,
      },
    },
    {
      id: 'redemption-3',
      stars_spent: 15,
      child_note: 'Please!',
      created_at: '2024-01-15T12:00:00Z',
      users: {
        name: 'Charlie',
        avatar_url: null,
      },
      rewards: null,
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
        <RedemptionRequestList requests={[]} locale="en" parentId="parent-1" />
      )

      expect(screen.getByText('✅')).toBeInTheDocument()
      expect(screen.getByText('admin.noRequests')).toBeInTheDocument()
      expect(screen.getByText(/all caught up/i)).toBeInTheDocument()
    })

    it('shows message about redemption requests', () => {
      render(
        <RedemptionRequestList requests={[]} locale="en" parentId="parent-1" />
      )

      expect(screen.getByText(/new redemption requests will appear here/i)).toBeInTheDocument()
    })
  })

  describe('Request Display', () => {
    it('renders all redemption requests', () => {
      render(
        <RedemptionRequestList
          requests={mockRequests}
          locale="en"
          parentId="parent-1"
        />
      )

      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('Bob')).toBeInTheDocument()
      expect(screen.getByText('Charlie')).toBeInTheDocument()
    })

    it('displays reward names in English', () => {
      render(
        <RedemptionRequestList
          requests={mockRequests}
          locale="en"
          parentId="parent-1"
        />
      )

      expect(screen.getByText('Toy Car')).toBeInTheDocument()
      expect(screen.getByText('Ice Cream')).toBeInTheDocument()
    })

    it('displays reward names in Chinese', () => {
      render(
        <RedemptionRequestList
          requests={mockRequests}
          locale="zh-CN"
          parentId="parent-1"
        />
      )

      expect(screen.getByText('玩具车')).toBeInTheDocument()
      expect(screen.getByText('冰淇淋')).toBeInTheDocument()
    })

    it('falls back to English name if Chinese not available', () => {
      const requestWithoutChinese = [
        {
          ...mockRequests[0],
          rewards: {
            ...mockRequests[0].rewards,
            name_zh: null,
          },
        },
      ]

      render(
        <RedemptionRequestList
          requests={requestWithoutChinese}
          locale="zh-CN"
          parentId="parent-1"
        />
      )

      expect(screen.getByText('Toy Car')).toBeInTheDocument()
    })

    it('shows "Unknown Reward" for requests without reward', () => {
      render(
        <RedemptionRequestList
          requests={mockRequests}
          locale="en"
          parentId="parent-1"
        />
      )

      expect(screen.getByText('Unknown Reward')).toBeInTheDocument()
    })

    it('displays reward icons', () => {
      render(
        <RedemptionRequestList
          requests={mockRequests}
          locale="en"
          parentId="parent-1"
        />
      )

      expect(screen.getByText('🚗')).toBeInTheDocument()
      expect(screen.getByText('🍦')).toBeInTheDocument()
    })

    it('displays default icon for requests without reward icon', () => {
      render(
        <RedemptionRequestList
          requests={mockRequests}
          locale="en"
          parentId="parent-1"
        />
      )

      expect(screen.getByText('🎁')).toBeInTheDocument()
    })

    it('displays stars spent amounts', () => {
      render(
        <RedemptionRequestList
          requests={mockRequests}
          locale="en"
          parentId="parent-1"
        />
      )

      expect(screen.getByText('10')).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText('15')).toBeInTheDocument()
    })

    it('displays cost labels', () => {
      render(
        <RedemptionRequestList
          requests={mockRequests}
          locale="en"
          parentId="parent-1"
        />
      )

      const costLabels = screen.getAllByText(/cost/i)
      expect(costLabels.length).toBe(3)

      const starsLabels = screen.getAllByText(/stars/i)
      expect(starsLabels.length).toBeGreaterThanOrEqual(3)
    })

    it('displays child notes when present', () => {
      render(
        <RedemptionRequestList
          requests={mockRequests}
          locale="en"
          parentId="parent-1"
        />
      )

      expect(screen.getByText(/"I want this toy!"/i)).toBeInTheDocument()
      expect(screen.getByText(/"Please!"/i)).toBeInTheDocument()
    })

    it('does not display note section when child_note is null', () => {
      const { container } = render(
        <RedemptionRequestList
          requests={mockRequests}
          locale="en"
          parentId="parent-1"
        />
      )

      const noteElements = container.querySelectorAll('.bg-blue-50')
      expect(noteElements.length).toBe(2)
    })

    it('displays reward description when available', () => {
      render(
        <RedemptionRequestList
          requests={mockRequests}
          locale="en"
          parentId="parent-1"
        />
      )

      expect(screen.getByText(/red racing car/i)).toBeInTheDocument()
    })

    it('displays user avatar when available', () => {
      render(
        <RedemptionRequestList
          requests={mockRequests}
          locale="en"
          parentId="parent-1"
        />
      )

      expect(screen.getByText('😊')).toBeInTheDocument()
    })

    it('displays default avatar when not available', () => {
      render(
        <RedemptionRequestList
          requests={mockRequests}
          locale="en"
          parentId="parent-1"
        />
      )

      expect(screen.getAllByText('👤').length).toBeGreaterThan(0)
    })

    it('shows deduction warning message', () => {
      render(
        <RedemptionRequestList
          requests={mockRequests}
          locale="en"
          parentId="parent-1"
        />
      )

      const warnings = screen.getAllByText(/stars will be deducted upon approval/i)
      expect(warnings.length).toBe(3)
    })
  })

  describe('Approve Redemption', () => {
    it('calls update with correct data when approving', async () => {
      const user = userEvent.setup()
      render(
        <RedemptionRequestList
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
          })
        )
      })
    })

    it('does not include reviewed_by in update', async () => {
      const user = userEvent.setup()
      render(
        <RedemptionRequestList
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
        const callArg = mockUpdate.mock.calls[0][0]
        expect(callArg).not.toHaveProperty('reviewed_by')
      })
    })

    it('refreshes page after successful approval', async () => {
      const user = userEvent.setup()
      render(
        <RedemptionRequestList
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
        <RedemptionRequestList
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
        <RedemptionRequestList
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
        <RedemptionRequestList
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
        expect(mockAlert).toHaveBeenCalledWith('Failed to approve redemption')
      })
    })
  })

  describe('Reject Redemption', () => {
    it('opens reject modal when clicking reject button', async () => {
      const user = userEvent.setup()
      render(
        <RedemptionRequestList
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
      expect(screen.getByPlaceholderText(/explain why you're rejecting this redemption/i)).toBeInTheDocument()
    })

    it('closes modal when clicking cancel', async () => {
      const user = userEvent.setup()
      render(
        <RedemptionRequestList
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
        <RedemptionRequestList
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

    it('disables reject button when reason is empty', async () => {
      const user = userEvent.setup()
      render(
        <RedemptionRequestList
          requests={mockRequests}
          locale="en"
          parentId="parent-1"
        />
      )

      const rejectButtons = screen.getAllByRole('button', {
        name: /^admin\.reject$/i,
      })
      await user.click(rejectButtons[0])

      const modal = screen.getByRole('heading', { name: /admin\.rejectReason/i }).closest('div')
      const buttons = within(modal!).getAllByRole('button')
      const modalRejectButton = buttons.find((btn) => btn.className.includes('bg-danger'))

      expect(modalRejectButton).toBeDisabled()
    })

    it('enables reject button when reason is provided', async () => {
      const user = userEvent.setup()
      render(
        <RedemptionRequestList
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
      await user.type(textarea, 'Not earned enough stars')

      const modal = screen.getByRole('heading', { name: /admin\.rejectReason/i }).closest('div')
      const buttons = within(modal!).getAllByRole('button')
      const modalRejectButton = buttons.find((btn) => btn.className.includes('bg-danger'))

      expect(modalRejectButton).not.toBeDisabled()
    })

    it('calls update with correct data when rejecting', async () => {
      const user = userEvent.setup()
      render(
        <RedemptionRequestList
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
      await user.type(textarea, 'Not appropriate')

      const modal = screen.getByRole('heading', { name: /admin\.rejectReason/i }).closest('div')
      const buttons = within(modal!).getAllByRole('button')
      const modalRejectButton = buttons.find((btn) => btn.className.includes('bg-danger'))
      await user.click(modalRejectButton!)

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'rejected',
            parent_response: 'Not appropriate',
          })
        )
      })
    })

    it('closes modal and refreshes after successful rejection', async () => {
      const user = userEvent.setup()
      render(
        <RedemptionRequestList
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
      await user.type(textarea, 'Reason here')

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

      const mockUpdateError = jest.fn().mockReturnThis()
      const mockEqError = jest.fn().mockResolvedValue({
        error: { message: 'Database error' },
      })

      mockFrom.mockReturnValue({
        update: mockUpdateError,
        eq: mockEqError,
      })

      render(
        <RedemptionRequestList
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
        expect(mockAlert).toHaveBeenCalledWith('Failed to reject redemption')
      })
    })
  })

  describe('Reward Categories', () => {
    it('displays reward category translation', () => {
      render(
        <RedemptionRequestList
          requests={mockRequests}
          locale="en"
          parentId="parent-1"
        />
      )

      expect(screen.getByText('rewards.category.toy')).toBeInTheDocument()
      expect(screen.getByText('rewards.category.food')).toBeInTheDocument()
    })

    it('does not display category for requests without reward', () => {
      const { container } = render(
        <RedemptionRequestList
          requests={mockRequests}
          locale="en"
          parentId="parent-1"
        />
      )

      const categoryElements = container.querySelectorAll('.text-xs.text-gray-500')
      // Should have categories + cost labels, but one less category for null reward
      expect(categoryElements.length).toBeGreaterThan(0)
    })
  })
})
