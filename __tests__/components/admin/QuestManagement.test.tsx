import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import QuestManagement from '@/components/admin/QuestManagement'
import type { Quest } from '@/types/quest'

// Mock router
const mockRefresh = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

// Mock Supabase
const mockUpdate = jest.fn()
const mockDelete = jest.fn()
const mockFrom = jest.fn()

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}))

// Mock QuestFormModal
jest.mock('@/components/admin/QuestFormModal', () => {
  return function MockQuestFormModal({ onClose, onSuccess, quest }: any) {
    return (
      <div data-testid="quest-form-modal">
        <button onClick={onClose}>Cancel</button>
        <button onClick={onSuccess}>Save</button>
        <span data-testid="modal-mode">{quest ? 'edit' : 'add'}</span>
      </div>
    )
  }
})

describe('QuestManagement', () => {
  const mockQuests: Quest[] = [
    {
      id: '1',
      family_id: 'family-1',
      name_en: 'Brush Teeth',
      name_zh: '刷牙',
      description_en: 'Brush teeth twice daily',
      description_zh: '每天刷牙两次',
      stars: 0,
      type: 'duty',
      scope: 'self',
      category: 'hygiene',
      icon: '🦷',
      is_active: true,
      is_template: true,
      created_at: '2024-01-01',
    },
    {
      id: '2',
      family_id: 'family-1',
      name_en: 'Help Mom Cook',
      name_zh: '帮妈妈做饭',
      description_en: 'Help prepare meals',
      description_zh: '帮助准备饭菜',
      stars: 3,
      type: 'bonus',
      scope: 'family',
      category: 'chores',
      icon: '👨‍🍳',
      is_active: true,
      is_template: true,
      created_at: '2024-01-01',
    },
    {
      id: '3',
      family_id: 'family-1',
      name_en: 'Fighting',
      name_zh: '打架',
      description_en: 'Physical aggression',
      description_zh: '身体攻击',
      stars: -5,
      type: 'violation',
      scope: 'self',
      category: 'other',
      icon: '🥊',
      is_active: false,
      is_template: true,
      created_at: '2024-01-01',
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()

    mockFrom.mockReturnValue({
      update: mockUpdate.mockReturnThis(),
      delete: mockDelete.mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null }),
    })

    // Mock window.confirm
    global.confirm = jest.fn(() => true)
  })

  // Helper: expand all collapsed groups by clicking all ▶ icons
  const expandAllGroups = () => {
    screen.queryAllByText('▶').forEach((icon) => {
      fireEvent.click(icon.closest('button')!)
    })
  }

  describe('Rendering', () => {
    it('renders quest management with quest count', () => {
      render(
        <QuestManagement quests={mockQuests} locale="en" familyId="family-1" />
      )

      expect(screen.getByText(/3 quest templates/i)).toBeInTheDocument()
      expect(screen.getByText(/➕/)).toBeInTheDocument()
    })

    it('renders in Chinese locale', () => {
      render(
        <QuestManagement quests={mockQuests} locale="zh-CN" familyId="family-1" />
      )

      expect(screen.getByText(/共 3 个任务模板/i)).toBeInTheDocument()
    })

    it('renders all quest groups', () => {
      render(
        <QuestManagement quests={mockQuests} locale="en" familyId="family-1" />
      )
      expandAllGroups()

      // Should have duty, bonus family, and violation groups
      expect(screen.getByText(/brush teeth/i)).toBeInTheDocument()
      expect(screen.getByText(/help mom cook/i)).toBeInTheDocument()
      expect(screen.getByText(/fighting/i)).toBeInTheDocument()
    })

    it('shows inactive badge for inactive quests', () => {
      render(
        <QuestManagement quests={mockQuests} locale="en" familyId="family-1" />
      )
      expandAllGroups()

      expect(screen.getByText(/inactive/i)).toBeInTheDocument()
    })

    it('displays quest stars with correct formatting', () => {
      render(
        <QuestManagement quests={mockQuests} locale="en" familyId="family-1" />
      )
      expandAllGroups()

      // Duty: 0 stars
      expect(screen.getByText(/^0 ⭐$/)).toBeInTheDocument()
      // Bonus: +3 stars
      expect(screen.getByText(/\+3 ⭐/)).toBeInTheDocument()
      // Violation: -5 stars
      expect(screen.getByText(/-5 ⭐/)).toBeInTheDocument()
    })

    it('displays quest categories', () => {
      render(
        <QuestManagement quests={mockQuests} locale="en" familyId="family-1" />
      )
      expandAllGroups()

      expect(screen.getByText(/hygiene/i)).toBeInTheDocument()
      expect(screen.getByText(/chores/i)).toBeInTheDocument()
    })

    it('displays quest icons', () => {
      render(
        <QuestManagement quests={mockQuests} locale="en" familyId="family-1" />
      )
      expandAllGroups()

      expect(screen.getByText('🦷')).toBeInTheDocument()
      expect(screen.getByText('👨‍🍳')).toBeInTheDocument()
      expect(screen.getByText('🥊')).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('shows empty state when no quests', () => {
      render(<QuestManagement quests={[]} locale="en" familyId="family-1" />)

      expect(screen.getByText(/no quest templates yet/i)).toBeInTheDocument()
      expect(screen.getByText(/0 quest templates/i)).toBeInTheDocument()
    })

    it('shows empty state in Chinese', () => {
      render(<QuestManagement quests={[]} locale="zh-CN" familyId="family-1" />)

      expect(screen.getByText(/还没有任务模板/i)).toBeInTheDocument()
    })

    it('has add button in empty state', () => {
      render(<QuestManagement quests={[]} locale="en" familyId="family-1" />)

      const addButtons = screen.getAllByRole('button', { name: /➕/i })
      expect(addButtons.length).toBeGreaterThan(0)
    })
  })

  describe('Group Expand/Collapse', () => {
    it('all groups are collapsed by default', () => {
      render(
        <QuestManagement quests={mockQuests} locale="en" familyId="family-1" />
      )

      // Quest content should NOT be visible (groups collapsed)
      expect(screen.queryByText(/brush teeth/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/help mom cook/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/fighting/i)).not.toBeInTheDocument()

      // Group headers should still be visible
      expect(screen.getByText(/my duties/i)).toBeInTheDocument()
      expect(screen.getByText(/helping family/i)).toBeInTheDocument()
      expect(screen.getByText(/violations/i)).toBeInTheDocument()
    })

    it('expands group when clicking header', async () => {
      const user = userEvent.setup()
      render(
        <QuestManagement quests={mockQuests} locale="en" familyId="family-1" />
      )

      // All collapsed — quest names not visible
      expect(screen.queryByText('Brush Teeth')).not.toBeInTheDocument()

      // Click the first group header (▶) to expand it
      const expandIcons = screen.getAllByText('▶')
      await user.click(expandIcons[0].closest('button')!)

      // The first group content should now be visible
      // First group is "My Duties" containing "Brush Teeth"
      expect(screen.getByText('Brush Teeth')).toBeInTheDocument()
    })

    it('shows expand icons for collapsed groups', () => {
      render(
        <QuestManagement quests={mockQuests} locale="en" familyId="family-1" />
      )

      // Should show expand icon (▶) for collapsed groups
      const expandIcons = screen.getAllByText('▶')
      expect(expandIcons).toHaveLength(3) // duties, family bonus, violations
      // No collapse icons should be present
      expect(screen.queryAllByText('▼')).toHaveLength(0)
    })
  })

  describe('Add Quest', () => {
    it('opens add modal when clicking add button', async () => {
      const user = userEvent.setup()
      render(
        <QuestManagement quests={mockQuests} locale="en" familyId="family-1" />
      )

      const addButton = screen.getByRole('button', { name: /quests\.addQuest/i })
      await user.click(addButton)

      expect(screen.getByTestId('quest-form-modal')).toBeInTheDocument()
      expect(screen.getByTestId('modal-mode')).toHaveTextContent('add')
    })

    it('closes add modal when clicking cancel', async () => {
      const user = userEvent.setup()
      render(
        <QuestManagement quests={mockQuests} locale="en" familyId="family-1" />
      )

      const addButton = screen.getByRole('button', { name: /quests\.addQuest/i })
      await user.click(addButton)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      expect(screen.queryByTestId('quest-form-modal')).not.toBeInTheDocument()
    })

    it('refreshes on successful add', async () => {
      const user = userEvent.setup()
      render(
        <QuestManagement quests={mockQuests} locale="en" familyId="family-1" />
      )

      const addButton = screen.getByRole('button', { name: /quests\.addQuest/i })
      await user.click(addButton)

      const saveButton = screen.getByRole('button', { name: /save/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled()
      })

      expect(screen.queryByTestId('quest-form-modal')).not.toBeInTheDocument()
    })
  })

  describe('Edit Quest', () => {
    it('opens edit modal when clicking edit button', async () => {
      const user = userEvent.setup()
      render(
        <QuestManagement quests={mockQuests} locale="en" familyId="family-1" />
      )
      expandAllGroups()

      const editButtons = screen.getAllByRole('button', { name: /edit/i })
      await user.click(editButtons[0])

      expect(screen.getByTestId('quest-form-modal')).toBeInTheDocument()
      expect(screen.getByTestId('modal-mode')).toHaveTextContent('edit')
    })

    it('shows edit button in Chinese', () => {
      render(
        <QuestManagement quests={mockQuests} locale="zh-CN" familyId="family-1" />
      )
      expandAllGroups()

      expect(screen.getAllByText(/编辑/i).length).toBeGreaterThan(0)
    })

    it('closes edit modal and refreshes on success', async () => {
      const user = userEvent.setup()
      render(
        <QuestManagement quests={mockQuests} locale="en" familyId="family-1" />
      )
      expandAllGroups()

      const editButtons = screen.getAllByRole('button', { name: /edit/i })
      await user.click(editButtons[0])

      const saveButton = screen.getByRole('button', { name: /save/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled()
      })

      expect(screen.queryByTestId('quest-form-modal')).not.toBeInTheDocument()
    })
  })

  describe('Toggle Active Status', () => {
    it('toggles quest from active to inactive', async () => {
      const user = userEvent.setup()
      render(
        <QuestManagement quests={mockQuests} locale="en" familyId="family-1" />
      )
      expandAllGroups()

      const disableButtons = screen.getAllByRole('button', { name: /disable/i })
      await user.click(disableButtons[0])

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith({ is_active: false })
        expect(mockRefresh).toHaveBeenCalled()
      })
    })

    it('toggles quest from inactive to active', async () => {
      const user = userEvent.setup()
      render(
        <QuestManagement quests={mockQuests} locale="en" familyId="family-1" />
      )
      expandAllGroups()

      const enableButton = screen.getByRole('button', { name: /enable/i })
      await user.click(enableButton)

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith({ is_active: true })
        expect(mockRefresh).toHaveBeenCalled()
      })
    })

    it('shows disable button in Chinese for active quests', () => {
      render(
        <QuestManagement quests={mockQuests} locale="zh-CN" familyId="family-1" />
      )
      expandAllGroups()

      expect(screen.getAllByText(/停用/i).length).toBeGreaterThan(0)
    })

    it('shows enable button in Chinese for inactive quests', () => {
      render(
        <QuestManagement quests={mockQuests} locale="zh-CN" familyId="family-1" />
      )
      expandAllGroups()

      expect(screen.getByText(/启用/i)).toBeInTheDocument()
    })

    it('handles toggle error gracefully', async () => {
      const user = userEvent.setup()
      const mockAlert = jest.fn()
      global.alert = mockAlert

      mockFrom.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: { message: 'Database error' } }),
      })

      render(
        <QuestManagement quests={mockQuests} locale="en" familyId="family-1" />
      )
      expandAllGroups()

      const disableButtons = screen.getAllByRole('button', { name: /disable/i })
      await user.click(disableButtons[0])

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('quests.toggleError')
      })
    })
  })

  describe('Delete Quest', () => {
    it('shows confirmation dialog before deleting', async () => {
      const user = userEvent.setup()
      const mockConfirm = jest.fn(() => true)
      global.confirm = mockConfirm

      render(
        <QuestManagement quests={mockQuests} locale="en" familyId="family-1" />
      )
      expandAllGroups()

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
      await user.click(deleteButtons[0])

      expect(mockConfirm).toHaveBeenCalled()
    })

    it('deletes quest when confirmed', async () => {
      const user = userEvent.setup()
      global.confirm = jest.fn(() => true)

      render(
        <QuestManagement quests={mockQuests} locale="en" familyId="family-1" />
      )
      expandAllGroups()

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
      await user.click(deleteButtons[0])

      await waitFor(() => {
        expect(mockDelete).toHaveBeenCalled()
        expect(mockRefresh).toHaveBeenCalled()
      })
    })

    it('does not delete quest when cancelled', async () => {
      const user = userEvent.setup()
      global.confirm = jest.fn(() => false)

      render(
        <QuestManagement quests={mockQuests} locale="en" familyId="family-1" />
      )
      expandAllGroups()

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
      await user.click(deleteButtons[0])

      expect(mockDelete).not.toHaveBeenCalled()
      expect(mockRefresh).not.toHaveBeenCalled()
    })

    it('shows delete button in Chinese', () => {
      render(
        <QuestManagement quests={mockQuests} locale="zh-CN" familyId="family-1" />
      )
      expandAllGroups()

      expect(screen.getAllByText(/删除/i).length).toBeGreaterThan(0)
    })

    it('uses Chinese quest name in confirmation', async () => {
      const user = userEvent.setup()
      const mockConfirm = jest.fn(() => true)
      global.confirm = mockConfirm

      render(
        <QuestManagement quests={mockQuests} locale="zh-CN" familyId="family-1" />
      )
      expandAllGroups()

      const deleteButtons = screen.getAllByRole('button', { name: /删除/i })
      await user.click(deleteButtons[0])

      // Should be called with Chinese quest name in the message
      expect(mockConfirm).toHaveBeenCalled()
    })

    it('handles delete error gracefully', async () => {
      const user = userEvent.setup()
      const mockAlert = jest.fn()
      global.alert = mockAlert
      global.confirm = jest.fn(() => true)

      mockFrom.mockReturnValue({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: { message: 'Cannot delete' } }),
      })

      render(
        <QuestManagement quests={mockQuests} locale="en" familyId="family-1" />
      )
      expandAllGroups()

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
      await user.click(deleteButtons[0])

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('quests.deleteError')
      })
    })
  })

  describe('Localization', () => {
    it('displays quest names in English', () => {
      render(
        <QuestManagement quests={mockQuests} locale="en" familyId="family-1" />
      )
      expandAllGroups()

      expect(screen.getByText(/brush teeth/i)).toBeInTheDocument()
      expect(screen.getByText(/help mom cook/i)).toBeInTheDocument()
      expect(screen.getByText(/fighting/i)).toBeInTheDocument()
    })

    it('displays quest names in Chinese', () => {
      render(
        <QuestManagement quests={mockQuests} locale="zh-CN" familyId="family-1" />
      )
      expandAllGroups()

      expect(screen.getByText(/刷牙/i)).toBeInTheDocument()
      expect(screen.getByText(/帮妈妈做饭/i)).toBeInTheDocument()
      expect(screen.getByText(/打架/i)).toBeInTheDocument()
    })

    it('falls back to English name if Chinese name is missing', () => {
      const questsWithoutChinese: Quest[] = [
        {
          ...mockQuests[0],
          name_zh: null,
        },
      ]

      render(
        <QuestManagement
          quests={questsWithoutChinese}
          locale="zh-CN"
          familyId="family-1"
        />
      )
      expandAllGroups()

      expect(screen.getByText(/brush teeth/i)).toBeInTheDocument()
    })
  })

  describe('Group Collapse/Expand - content visibility', () => {
    it('shows group content when group header is clicked to expand', async () => {
      const user = userEvent.setup()
      render(
        <QuestManagement quests={mockQuests} locale="en" familyId="family-1" />
      )

      // All groups collapsed — quest names not visible
      expect(screen.queryByText('Brush Teeth')).not.toBeInTheDocument()

      // Click the first group header (▶) to expand
      const expandIcons = screen.getAllByText('▶')
      await user.click(expandIcons[0].closest('button')!)

      // First group is "My Duties" containing "Brush Teeth"
      expect(screen.getByText('Brush Teeth')).toBeInTheDocument()
      // The expanded group should now show ▼
      expect(screen.getAllByText('▼')).toHaveLength(1)
      // Remaining groups still collapsed
      expect(screen.getAllByText('▶')).toHaveLength(2)
    })

    it('hides group content when expanded group header is clicked to collapse', async () => {
      const user = userEvent.setup()
      render(
        <QuestManagement quests={mockQuests} locale="en" familyId="family-1" />
      )

      // Expand first group
      const expandIcons = screen.getAllByText('▶')
      await user.click(expandIcons[0].closest('button')!)
      expect(screen.getByText('Brush Teeth')).toBeInTheDocument()

      // Collapse it again by clicking the ▼
      const collapseIcon = screen.getByText('▼')
      await user.click(collapseIcon.closest('button')!)

      // Content should be hidden again
      expect(screen.queryByText('Brush Teeth')).not.toBeInTheDocument()
      // All icons should be ▶ again
      expect(screen.queryAllByText('▼')).toHaveLength(0)
      expect(screen.getAllByText('▶')).toHaveLength(3)
    })

    it('re-expands group content after collapsing', async () => {
      const user = userEvent.setup()
      render(
        <QuestManagement quests={mockQuests} locale="en" familyId="family-1" />
      )

      // Expand → collapse → re-expand
      const expandIcons = screen.getAllByText('▶')
      await user.click(expandIcons[0].closest('button')!)
      expect(screen.getByText('Brush Teeth')).toBeInTheDocument()

      const collapseIcon = screen.getByText('▼')
      await user.click(collapseIcon.closest('button')!)
      expect(screen.queryByText('Brush Teeth')).not.toBeInTheDocument()

      const expandIconsAgain = screen.getAllByText('▶')
      await user.click(expandIconsAgain[0].closest('button')!)
      expect(screen.getByText('Brush Teeth')).toBeInTheDocument()
    })
  })

  describe('Category display with categories prop', () => {
    const mockCategories: import('@/types/category').QuestCategoryRow[] = [
      {
        id: 'cat-1',
        family_id: 'family-1',
        name: 'hygiene',
        name_en: 'Hygiene',
        name_zh: '卫生',
        icon: '🧼',
        is_active: true,
        sort_order: 1,
        created_at: '2024-01-01',
      },
      {
        id: 'cat-2',
        family_id: 'family-1',
        name: 'chores',
        name_en: 'Chores',
        name_zh: '家务',
        icon: '🧹',
        is_active: true,
        sort_order: 2,
        created_at: '2024-01-01',
      },
      {
        id: 'cat-3',
        family_id: 'family-1',
        name: 'other',
        name_en: 'Other',
        name_zh: '其他',
        icon: '📦',
        is_active: true,
        sort_order: 3,
        created_at: '2024-01-01',
      },
    ]

    it('displays category with icon and English name when categories prop is provided', () => {
      render(
        <QuestManagement
          quests={mockQuests}
          locale="en"
          familyId="family-1"
          categories={mockCategories}
        />
      )
      expandAllGroups()

      // Quest 1 has category "hygiene" which matches cat-1
      // Should display "🧼 Hygiene" instead of just "hygiene"
      expect(screen.getByText('🧼 Hygiene')).toBeInTheDocument()
      // Quest 2 has category "chores" which matches cat-2
      expect(screen.getByText('🧹 Chores')).toBeInTheDocument()
    })

    it('displays category with icon and Chinese name in zh-CN locale', () => {
      render(
        <QuestManagement
          quests={mockQuests}
          locale="zh-CN"
          familyId="family-1"
          categories={mockCategories}
        />
      )
      expandAllGroups()

      // In zh-CN, should show Chinese names
      expect(screen.getByText('🧼 卫生')).toBeInTheDocument()
      expect(screen.getByText('🧹 家务')).toBeInTheDocument()
    })

    it('falls back to raw category name when category not found in categories array', () => {
      // Use a quest with a category that doesn't exist in categories array
      const questWithUnknownCategory: Quest[] = [
        {
          id: '99',
          family_id: 'family-1',
          name_en: 'Special Quest',
          name_zh: '特殊任务',
          description_en: 'test',
          description_zh: 'test',
          stars: 5,
          type: 'bonus',
          scope: 'self',
          category: 'unknowncat',
          icon: '🎯',
          is_active: true,
          is_template: true,
          created_at: '2024-01-01',
        },
      ]

      render(
        <QuestManagement
          quests={questWithUnknownCategory}
          locale="en"
          familyId="family-1"
          categories={mockCategories}
        />
      )
      expandAllGroups()

      // Should fall back to raw category name
      expect(screen.getByText('unknowncat')).toBeInTheDocument()
    })
  })

  describe('Empty state add button', () => {
    it('opens modal when clicking add button in empty state', async () => {
      const user = userEvent.setup()
      render(<QuestManagement quests={[]} locale="en" familyId="family-1" />)

      // The empty state has a specific "add first quest" button
      // It contains ➕ and the translation key quests.addFirstQuest
      const emptyStateButton = screen.getByRole('button', {
        name: /quests\.addFirstQuest/i,
      })
      await user.click(emptyStateButton)

      expect(screen.getByTestId('quest-form-modal')).toBeInTheDocument()
      expect(screen.getByTestId('modal-mode')).toHaveTextContent('add')
    })
  })

  describe('Branch coverage', () => {
    it('falls back to English name when name_zh is null for zh-CN locale in quest display', () => {
      const questsWithNullZh: Quest[] = [
        {
          ...mockQuests[1],
          name_zh: null,
        },
      ]

      render(
        <QuestManagement
          quests={questsWithNullZh}
          locale="zh-CN"
          familyId="family-1"
        />
      )
      expandAllGroups()

      // Should display English name as fallback
      expect(screen.getByText('Help Mom Cook')).toBeInTheDocument()
    })

    it('falls back to 📝 icon when quest icon is null', () => {
      const questWithNullIcon: Quest[] = [
        {
          ...mockQuests[1],
          icon: null,
        },
      ]

      render(
        <QuestManagement
          quests={questWithNullIcon}
          locale="en"
          familyId="family-1"
        />
      )
      expandAllGroups()

      // The fallback icon "📝" should be displayed
      expect(screen.getByText('📝')).toBeInTheDocument()
    })
  })

  describe('Edit quest close handler', () => {
    it('closes edit modal when cancel is clicked without refreshing', async () => {
      const user = userEvent.setup()
      render(
        <QuestManagement quests={mockQuests} locale="en" familyId="family-1" />
      )
      expandAllGroups()

      // Open edit modal
      const editButtons = screen.getAllByRole('button', { name: /edit/i })
      await user.click(editButtons[0])

      expect(screen.getByTestId('quest-form-modal')).toBeInTheDocument()
      expect(screen.getByTestId('modal-mode')).toHaveTextContent('edit')

      // Click cancel (the onClose handler)
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      // Modal should be closed
      expect(screen.queryByTestId('quest-form-modal')).not.toBeInTheDocument()
      // router.refresh should NOT have been called (cancel doesn't refresh)
      expect(mockRefresh).not.toHaveBeenCalled()
    })
  })
})
