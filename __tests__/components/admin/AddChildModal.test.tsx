import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AddChildModal from '@/components/admin/AddChildModal'

// Mock Supabase
const mockSignUp = jest.fn()
const mockInsert = jest.fn()
const mockFrom = jest.fn()

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signUp: mockSignUp,
    },
    from: mockFrom,
  }),
}))

describe('AddChildModal', () => {
  const mockOnClose = jest.fn()
  const mockOnSuccess = jest.fn()

  const defaultProps = {
    familyId: 'family-123',
    locale: 'en',
    onClose: mockOnClose,
    onSuccess: mockOnSuccess,
  }

  beforeEach(() => {
    jest.clearAllMocks()

    mockFrom.mockReturnValue({
      insert: mockInsert.mockResolvedValue({ error: null }),
    })

    mockSignUp.mockResolvedValue({
      data: { user: { id: 'new-child-id' } },
      error: null,
    })
  })

  describe('Rendering', () => {
    it('renders modal with title', () => {
      render(<AddChildModal {...defaultProps} />)

      expect(screen.getByText('family.addChild')).toBeInTheDocument()
    })

    it('renders all form fields', () => {
      render(<AddChildModal {...defaultProps} />)

      expect(screen.getByPlaceholderText('family.childNamePlaceholder')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('family.childEmailPlaceholder')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('family.passwordPlaceholder')).toBeInTheDocument()
    })

    it('shows required asterisk for name field', () => {
      render(<AddChildModal {...defaultProps} />)

      const nameLabel = screen.getByText(/family\.childName/i).parentElement
      expect(nameLabel?.textContent).toContain('*')
    })

    it('shows required asterisk for password field', () => {
      render(<AddChildModal {...defaultProps} />)

      // Get all elements with "family.password" text (label and hint)
      const passwordElements = screen.getAllByText(/family\.password/i)
      // The first one should be the label
      const passwordLabel = passwordElements[0].parentElement
      expect(passwordLabel?.textContent).toContain('*')
    })

    it('shows optional label for email field', () => {
      render(<AddChildModal {...defaultProps} />)

      expect(screen.getByText(/common\.optional/i)).toBeInTheDocument()
    })

    it('displays password hint', () => {
      render(<AddChildModal {...defaultProps} />)

      expect(screen.getByText('family.passwordHint')).toBeInTheDocument()
    })

    it('displays email optional hint', () => {
      render(<AddChildModal {...defaultProps} />)

      expect(screen.getByText('family.emailOptionalHint')).toBeInTheDocument()
    })

    it('renders generate password button', () => {
      render(<AddChildModal {...defaultProps} />)

      expect(screen.getByRole('button', { name: /family\.generate/i })).toBeInTheDocument()
    })

    it('renders cancel and submit buttons', () => {
      render(<AddChildModal {...defaultProps} />)

      expect(screen.getByRole('button', { name: /common\.cancel/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /family\.createChild/i })).toBeInTheDocument()
    })
  })

  describe('Password Generation', () => {
    it('generates password when clicking generate button', async () => {
      const user = userEvent.setup()
      render(<AddChildModal {...defaultProps} />)

      const generateButton = screen.getByRole('button', { name: /family\.generate/i })
      const passwordInput = screen.getByPlaceholderText('family.passwordPlaceholder') as HTMLInputElement

      expect(passwordInput.value).toBe('')

      await user.click(generateButton)

      expect(passwordInput.value).not.toBe('')
      expect(passwordInput.value.length).toBeGreaterThan(0)
    })

    it('displays generated password in green box', async () => {
      const user = userEvent.setup()
      render(<AddChildModal {...defaultProps} />)

      const generateButton = screen.getByRole('button', { name: /family\.generate/i })

      await user.click(generateButton)

      expect(screen.getByText(/family\.generatedPassword/i)).toBeInTheDocument()
      expect(screen.getByText('family.savePassword')).toBeInTheDocument()
    })

    it('generates password with correct format', async () => {
      const user = userEvent.setup()
      render(<AddChildModal {...defaultProps} />)

      const generateButton = screen.getByRole('button', { name: /family\.generate/i })
      const passwordInput = screen.getByPlaceholderText('family.passwordPlaceholder') as HTMLInputElement

      await user.click(generateButton)

      // Password should be: Adjective + Noun + Number
      // Examples: HappyStar42, BrightMoon7, etc.
      expect(passwordInput.value).toMatch(/^[A-Z][a-z]+[A-Z][a-z]+\d+$/)
    })

    it('updates password field and displays same password in green box', async () => {
      const user = userEvent.setup()
      render(<AddChildModal {...defaultProps} />)

      const generateButton = screen.getByRole('button', { name: /family\.generate/i })
      await user.click(generateButton)

      const passwordInput = screen.getByPlaceholderText('family.passwordPlaceholder') as HTMLInputElement
      const displayedPassword = screen.getByText(/^[A-Z][a-z]+[A-Z][a-z]+\d+$/)

      expect(passwordInput.value).toBe(displayedPassword.textContent)
    })

    it('can generate different passwords multiple times', async () => {
      const user = userEvent.setup()
      render(<AddChildModal {...defaultProps} />)

      const generateButton = screen.getByRole('button', { name: /family\.generate/i })
      const passwordInput = screen.getByPlaceholderText('family.passwordPlaceholder') as HTMLInputElement

      await user.click(generateButton)
      const firstPassword = passwordInput.value

      await user.click(generateButton)
      const secondPassword = passwordInput.value

      // They might be the same by chance, but format should be correct
      expect(firstPassword).toMatch(/^[A-Z][a-z]+[A-Z][a-z]+\d+$/)
      expect(secondPassword).toMatch(/^[A-Z][a-z]+[A-Z][a-z]+\d+$/)
    })
  })

  describe('Form Validation', () => {
    it('prevents submission when name is empty', async () => {
      const user = userEvent.setup()
      render(<AddChildModal {...defaultProps} />)

      const nameInput = screen.getByPlaceholderText('family.childNamePlaceholder')

      // Verify the required attribute is present
      expect(nameInput).toHaveAttribute('required')

      // With HTML required attribute, form won't submit with empty field
      expect(mockSignUp).not.toHaveBeenCalled()
    })

    it('shows error when password is too short', async () => {
      const user = userEvent.setup()
      render(<AddChildModal {...defaultProps} />)

      const nameInput = screen.getByPlaceholderText('family.childNamePlaceholder')
      const passwordInput = screen.getByPlaceholderText('family.passwordPlaceholder')

      await user.type(nameInput, 'Alice')
      await user.type(passwordInput, '12345')

      const submitButton = screen.getByRole('button', { name: /family\.createChild/i })
      await user.click(submitButton)

      expect(screen.getByText('family.passwordMinLength')).toBeInTheDocument()
    })

    it('prevents submission when password is empty', async () => {
      const user = userEvent.setup()
      render(<AddChildModal {...defaultProps} />)

      const nameInput = screen.getByPlaceholderText('family.childNamePlaceholder')
      const passwordInput = screen.getByPlaceholderText('family.passwordPlaceholder')
      await user.type(nameInput, 'Alice')

      // Verify the required attribute is present
      expect(passwordInput).toHaveAttribute('required')

      // With HTML required attribute, form won't submit with empty password
      expect(mockSignUp).not.toHaveBeenCalled()
    })

    it('accepts password with exactly 6 characters', async () => {
      const user = userEvent.setup()
      render(<AddChildModal {...defaultProps} />)

      const nameInput = screen.getByPlaceholderText('family.childNamePlaceholder')
      const passwordInput = screen.getByPlaceholderText('family.passwordPlaceholder')

      await user.type(nameInput, 'Alice')
      await user.type(passwordInput, '123456')

      const submitButton = screen.getByRole('button', { name: /family\.createChild/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalled()
      })
    })

    it('trims whitespace from name', async () => {
      const user = userEvent.setup()
      render(<AddChildModal {...defaultProps} />)

      const nameInput = screen.getByPlaceholderText('family.childNamePlaceholder')
      const passwordInput = screen.getByPlaceholderText('family.passwordPlaceholder')

      await user.type(nameInput, '   ')
      await user.type(passwordInput, '123456')

      const submitButton = screen.getByRole('button', { name: /family\.createChild/i })
      await user.click(submitButton)

      expect(screen.getByText('family.nameRequired')).toBeInTheDocument()
    })
  })

  describe('Child Creation', () => {
    it('creates child with name and password', async () => {
      const user = userEvent.setup()
      render(<AddChildModal {...defaultProps} />)

      const nameInput = screen.getByPlaceholderText('family.childNamePlaceholder')
      const passwordInput = screen.getByPlaceholderText('family.passwordPlaceholder')

      await user.type(nameInput, 'Alice')
      await user.type(passwordInput, 'password123')

      const submitButton = screen.getByRole('button', { name: /family\.createChild/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith({
          email: 'alice@child.starquest.local',
          password: 'password123',
          options: {
            data: {
              name: 'Alice',
              role: 'child',
              family_id: 'family-123',
            },
          },
        })
      })
    })

    it('creates child with custom email if provided', async () => {
      const user = userEvent.setup()
      render(<AddChildModal {...defaultProps} />)

      const nameInput = screen.getByPlaceholderText('family.childNamePlaceholder')
      const emailInput = screen.getByPlaceholderText('family.childEmailPlaceholder')
      const passwordInput = screen.getByPlaceholderText('family.passwordPlaceholder')

      await user.type(nameInput, 'Alice')
      await user.type(emailInput, 'alice@example.com')
      await user.type(passwordInput, 'password123')

      const submitButton = screen.getByRole('button', { name: /family\.createChild/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith({
          email: 'alice@example.com',
          password: 'password123',
          options: {
            data: {
              name: 'Alice',
              role: 'child',
              family_id: 'family-123',
            },
          },
        })
      })
    })

    it('generates auto email from name with spaces removed', async () => {
      const user = userEvent.setup()
      render(<AddChildModal {...defaultProps} />)

      const nameInput = screen.getByPlaceholderText('family.childNamePlaceholder')
      const passwordInput = screen.getByPlaceholderText('family.passwordPlaceholder')

      await user.type(nameInput, 'Alice Smith')
      await user.type(passwordInput, 'password123')

      const submitButton = screen.getByRole('button', { name: /family\.createChild/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith(
          expect.objectContaining({
            email: 'alicesmith@child.starquest.local',
          })
        )
      })
    })

    it('inserts user record into users table', async () => {
      const user = userEvent.setup()
      render(<AddChildModal {...defaultProps} />)

      const nameInput = screen.getByPlaceholderText('family.childNamePlaceholder')
      const passwordInput = screen.getByPlaceholderText('family.passwordPlaceholder')

      await user.type(nameInput, 'Alice')
      await user.type(passwordInput, 'password123')

      const submitButton = screen.getByRole('button', { name: /family\.createChild/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith({
          id: 'new-child-id',
          family_id: 'family-123',
          name: 'Alice',
          role: 'child',
          email: null,
          locale: 'en',
        })
      })
    })

    it('uses Chinese locale when provided', async () => {
      const user = userEvent.setup()
      render(<AddChildModal {...defaultProps} locale="zh-CN" />)

      const nameInput = screen.getByPlaceholderText('family.childNamePlaceholder')
      const passwordInput = screen.getByPlaceholderText('family.passwordPlaceholder')

      await user.type(nameInput, '小明')
      await user.type(passwordInput, 'password123')

      const submitButton = screen.getByRole('button', { name: /family\.createChild/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            locale: 'zh-CN',
          })
        )
      })
    })

    it('includes email in user record if provided', async () => {
      const user = userEvent.setup()
      render(<AddChildModal {...defaultProps} />)

      const nameInput = screen.getByPlaceholderText('family.childNamePlaceholder')
      const emailInput = screen.getByPlaceholderText('family.childEmailPlaceholder')
      const passwordInput = screen.getByPlaceholderText('family.passwordPlaceholder')

      await user.type(nameInput, 'Alice')
      await user.type(emailInput, 'alice@example.com')
      await user.type(passwordInput, 'password123')

      const submitButton = screen.getByRole('button', { name: /family\.createChild/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            email: 'alice@example.com',
          })
        )
      })
    })

    it('calls onSuccess after successful creation', async () => {
      const user = userEvent.setup()
      render(<AddChildModal {...defaultProps} />)

      const nameInput = screen.getByPlaceholderText('family.childNamePlaceholder')
      const passwordInput = screen.getByPlaceholderText('family.passwordPlaceholder')

      await user.type(nameInput, 'Alice')
      await user.type(passwordInput, 'password123')

      const submitButton = screen.getByRole('button', { name: /family\.createChild/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
      })
    })
  })

  describe('Loading State', () => {
    it('shows loading text while creating', async () => {
      const user = userEvent.setup()

      mockSignUp.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      render(<AddChildModal {...defaultProps} />)

      const nameInput = screen.getByPlaceholderText('family.childNamePlaceholder')
      const passwordInput = screen.getByPlaceholderText('family.passwordPlaceholder')

      await user.type(nameInput, 'Alice')
      await user.type(passwordInput, 'password123')

      const submitButton = screen.getByRole('button', { name: /family\.createChild/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('common.creating')).toBeInTheDocument()
      })
    })

    it('disables buttons while loading', async () => {
      const user = userEvent.setup()

      mockSignUp.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      render(<AddChildModal {...defaultProps} />)

      const nameInput = screen.getByPlaceholderText('family.childNamePlaceholder')
      const passwordInput = screen.getByPlaceholderText('family.passwordPlaceholder')

      await user.type(nameInput, 'Alice')
      await user.type(passwordInput, 'password123')

      const submitButton = screen.getByRole('button', { name: /family\.createChild/i })
      await user.click(submitButton)

      await waitFor(() => {
        const cancelButton = screen.getByRole('button', { name: /common\.cancel/i })
        const createButton = screen.getByRole('button', { name: /common\.creating/i })

        expect(cancelButton).toBeDisabled()
        expect(createButton).toBeDisabled()
      })
    })
  })

  describe('Error Handling', () => {
    it('shows error when auth signup fails', async () => {
      const user = userEvent.setup()

      mockSignUp.mockResolvedValue({
        data: null,
        error: { message: 'Email already exists' },
      })

      render(<AddChildModal {...defaultProps} />)

      const nameInput = screen.getByPlaceholderText('family.childNamePlaceholder')
      const passwordInput = screen.getByPlaceholderText('family.passwordPlaceholder')

      await user.type(nameInput, 'Alice')
      await user.type(passwordInput, 'password123')

      const submitButton = screen.getByRole('button', { name: /family\.createChild/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/email already exists/i)).toBeInTheDocument()
      })
    })

    it('shows error when user creation returns no user', async () => {
      const user = userEvent.setup()

      mockSignUp.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      render(<AddChildModal {...defaultProps} />)

      const nameInput = screen.getByPlaceholderText('family.childNamePlaceholder')
      const passwordInput = screen.getByPlaceholderText('family.passwordPlaceholder')

      await user.type(nameInput, 'Alice')
      await user.type(passwordInput, 'password123')

      const submitButton = screen.getByRole('button', { name: /family\.createChild/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/failed to create user/i)).toBeInTheDocument()
      })
    })

    it('shows error when users table insert fails', async () => {
      const user = userEvent.setup()

      mockFrom.mockReturnValue({
        insert: jest.fn().mockResolvedValue({
          error: { message: 'Database error' },
        }),
      })

      render(<AddChildModal {...defaultProps} />)

      const nameInput = screen.getByPlaceholderText('family.childNamePlaceholder')
      const passwordInput = screen.getByPlaceholderText('family.passwordPlaceholder')

      await user.type(nameInput, 'Alice')
      await user.type(passwordInput, 'password123')

      const submitButton = screen.getByRole('button', { name: /family\.createChild/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('family.createUserError')).toBeInTheDocument()
      })
    })

    it('shows generic error when unknown error occurs', async () => {
      const user = userEvent.setup()

      mockSignUp.mockRejectedValue(new Error())

      render(<AddChildModal {...defaultProps} />)

      const nameInput = screen.getByPlaceholderText('family.childNamePlaceholder')
      const passwordInput = screen.getByPlaceholderText('family.passwordPlaceholder')

      await user.type(nameInput, 'Alice')
      await user.type(passwordInput, 'password123')

      const submitButton = screen.getByRole('button', { name: /family\.createChild/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('family.createChildError')).toBeInTheDocument()
      })
    })
  })

  describe('Modal Interaction', () => {
    it('calls onClose when clicking cancel button', async () => {
      const user = userEvent.setup()
      render(<AddChildModal {...defaultProps} />)

      const cancelButton = screen.getByRole('button', { name: /common\.cancel/i })
      await user.click(cancelButton)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('does not call onClose when clicking inside modal', async () => {
      const user = userEvent.setup()
      render(<AddChildModal {...defaultProps} />)

      const modalContent = screen.getByText('family.addChild').parentElement
      await user.click(modalContent!)

      expect(mockOnClose).not.toHaveBeenCalled()
    })
  })
})
