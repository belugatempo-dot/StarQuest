import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RegisterForm from '@/components/auth/RegisterForm'

// Mock the Supabase client
const mockSignUp = jest.fn()
const mockRpc = jest.fn()

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signUp: mockSignUp,
    },
    rpc: mockRpc,
  }),
}))

// Mock next/navigation
let mockPathname = '/en/register'
const mockSearchParams = new URLSearchParams()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: jest.fn(() => mockPathname),
  useSearchParams: () => mockSearchParams,
}))

describe('RegisterForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPathname = '/en/register'
    mockSearchParams.delete('invite')
    delete (window as any).location
    ;(window as any).location = { href: '', origin: 'http://localhost:3000' }
  })

  describe('Form Rendering', () => {
    it('renders all form fields for new family registration', () => {
      render(<RegisterForm />)

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/family name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/your name \(parent\)/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/invite code/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument()
    })

    it('renders form in Chinese locale', () => {
      mockPathname = '/zh-CN/register'
      render(<RegisterForm />)

      expect(screen.getByLabelText(/邮箱/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^密码$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/确认密码/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/家庭名称/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/您的名字（家长）/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /注册/i })).toBeInTheDocument()
    })

    it('shows link to login page', () => {
      render(<RegisterForm />)

      const loginLink = screen.getByRole('link', { name: /sign in/i })
      expect(loginLink).toHaveAttribute('href', '/en/login')
    })
  })

  describe('Password Validation', () => {
    it('shows error when passwords do not match (English)', async () => {
      const user = userEvent.setup()
      render(<RegisterForm />)

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/^password$/i), 'password123')
      await user.type(screen.getByLabelText(/confirm password/i), 'password456')
      await user.type(screen.getByLabelText(/family name/i), 'Smith Family')
      await user.type(screen.getByLabelText(/your name \(parent\)/i), 'John')

      fireEvent.submit(screen.getByRole('button', { name: /register/i }))

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
      })

      expect(mockSignUp).not.toHaveBeenCalled()
    })

    it('shows error when passwords do not match (Chinese)', async () => {
      const user = userEvent.setup()
      mockPathname = '/zh-CN/register'
      render(<RegisterForm />)

      await user.type(screen.getByLabelText(/邮箱/i), 'test@example.com')
      await user.type(screen.getByLabelText(/^密码$/i), 'password123')
      await user.type(screen.getByLabelText(/确认密码/i), 'password456')
      await user.type(screen.getByLabelText(/家庭名称/i), '张家')
      await user.type(screen.getByLabelText(/您的名字（家长）/i), '张三')

      fireEvent.submit(screen.getByRole('button', { name: /注册/i }))

      await waitFor(() => {
        expect(screen.getByText(/密码不匹配/i)).toBeInTheDocument()
      })
    })

    it('shows error when password is too short', async () => {
      const user = userEvent.setup()
      render(<RegisterForm />)

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/^password$/i), '12345')
      await user.type(screen.getByLabelText(/confirm password/i), '12345')
      await user.type(screen.getByLabelText(/family name/i), 'Smith Family')
      await user.type(screen.getByLabelText(/your name \(parent\)/i), 'John')

      fireEvent.submit(screen.getByRole('button', { name: /register/i }))

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument()
      })
    })
  })

  describe('Required Field Validation', () => {
    it('shows error when parent name is missing', async () => {
      const user = userEvent.setup()
      render(<RegisterForm />)

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/^password$/i), 'password123')
      await user.type(screen.getByLabelText(/confirm password/i), 'password123')
      await user.type(screen.getByLabelText(/family name/i), 'Smith Family')

      fireEvent.submit(screen.getByRole('button', { name: /register/i }))

      await waitFor(() => {
        expect(screen.getByText(/please enter your name/i)).toBeInTheDocument()
      })
    })

    it('shows error when family name is missing (new family)', async () => {
      const user = userEvent.setup()
      render(<RegisterForm />)

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/^password$/i), 'password123')
      await user.type(screen.getByLabelText(/confirm password/i), 'password123')
      await user.type(screen.getByLabelText(/your name \(parent\)/i), 'John')

      fireEvent.submit(screen.getByRole('button', { name: /register/i }))

      await waitFor(() => {
        expect(screen.getByText(/please enter family name/i)).toBeInTheDocument()
      })
    })
  })

  describe('Invite Code Validation', () => {
    it('converts invite code to uppercase', async () => {
      const user = userEvent.setup()
      render(<RegisterForm />)

      const inviteInput = screen.getByLabelText(/invite code/i)
      await user.type(inviteInput, 'abc')

      expect(inviteInput).toHaveValue('ABC')
    })

    it('shows error when invite code is not 8 characters', async () => {
      const user = userEvent.setup()
      render(<RegisterForm />)

      await user.type(screen.getByLabelText(/invite code/i), 'SHORT')

      await waitFor(() => {
        expect(screen.getByText(/invite code should be 8 characters/i)).toBeInTheDocument()
      })
    })

    it('validates invite code and shows family name on success', async () => {
      const user = userEvent.setup()

      mockRpc.mockResolvedValue({
        data: [{ is_valid: true, family_name: 'Smith Family', family_id: 'family-123' }],
        error: null,
      })

      render(<RegisterForm />)

      await user.type(screen.getByLabelText(/invite code/i), 'ABCD1234')

      await waitFor(() => {
        expect(screen.getByText(/✓ joining family:/i)).toBeInTheDocument()
        expect(screen.getByText(/smith family/i)).toBeInTheDocument()
      })

      expect(mockRpc).toHaveBeenCalledWith('validate_invite_code', {
        p_invite_code: 'ABCD1234',
      })
    })

    it('shows error when invite code is invalid', async () => {
      const user = userEvent.setup()

      mockRpc.mockResolvedValue({
        data: [{ is_valid: false }],
        error: null,
      })

      render(<RegisterForm />)

      await user.type(screen.getByLabelText(/invite code/i), 'INVALID1')

      await waitFor(() => {
        expect(screen.getByText(/invalid or expired invite code/i)).toBeInTheDocument()
      })
    })

    it('hides family name field when valid invite code is entered', async () => {
      const user = userEvent.setup()

      mockRpc.mockResolvedValue({
        data: [{ is_valid: true, family_name: 'Smith Family', family_id: 'family-123' }],
        error: null,
      })

      render(<RegisterForm />)

      // Family name field should be visible initially
      expect(screen.getByLabelText(/family name/i)).toBeInTheDocument()

      await user.type(screen.getByLabelText(/invite code/i), 'ABCD1234')

      await waitFor(() => {
        expect(screen.queryByLabelText(/family name/i)).not.toBeInTheDocument()
      })
    })

    it('loads invite code from URL parameter', async () => {
      mockSearchParams.set('invite', 'URLCODE1')

      mockRpc.mockResolvedValue({
        data: [{ is_valid: true, family_name: 'URL Family', family_id: 'family-url' }],
        error: null,
      })

      render(<RegisterForm />)

      await waitFor(() => {
        expect(screen.getByLabelText(/invite code/i)).toHaveValue('URLCODE1')
        expect(mockRpc).toHaveBeenCalledWith('validate_invite_code', {
          p_invite_code: 'URLCODE1',
        })
      })
    })
  })

  describe('Registration - New Family', () => {
    it('successfully registers new family and redirects to verify-email', async () => {
      const user = userEvent.setup()

      mockSignUp.mockResolvedValue({
        data: { user: { id: 'new-user-id' } },
        error: null,
      })

      mockRpc.mockResolvedValue({
        data: 'new-family-id',
        error: null,
      })

      render(<RegisterForm />)

      await user.type(screen.getByLabelText(/email/i), 'parent@example.com')
      await user.type(screen.getByLabelText(/^password$/i), 'password123')
      await user.type(screen.getByLabelText(/confirm password/i), 'password123')
      await user.type(screen.getByLabelText(/family name/i), 'Smith Family')
      await user.type(screen.getByLabelText(/your name \(parent\)/i), 'John Smith')

      fireEvent.submit(screen.getByRole('button', { name: /register/i }))

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith({
          email: 'parent@example.com',
          password: 'password123',
          options: {
            emailRedirectTo: 'http://localhost:3000/en/auth/callback',
          },
        })
      })

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledWith('create_family_with_templates', {
          p_family_name: 'Smith Family',
          p_user_id: 'new-user-id',
          p_user_name: 'John Smith',
          p_user_email: 'parent@example.com',
          p_user_locale: 'en',
        })
      })

      await waitFor(() => {
        expect(window.location.href).toBe('/en/auth/verify-email?email=parent%40example.com')
      })
    })

    it('uses correct locale for Chinese registration', async () => {
      const user = userEvent.setup()
      mockPathname = '/zh-CN/register'

      mockSignUp.mockResolvedValue({
        data: { user: { id: 'new-user-id' } },
        error: null,
      })

      mockRpc.mockResolvedValue({
        data: 'new-family-id',
        error: null,
      })

      render(<RegisterForm />)

      await user.type(screen.getByLabelText(/邮箱/i), 'parent@example.com')
      await user.type(screen.getByLabelText(/^密码$/i), 'password123')
      await user.type(screen.getByLabelText(/确认密码/i), 'password123')
      await user.type(screen.getByLabelText(/家庭名称/i), '张家')
      await user.type(screen.getByLabelText(/您的名字（家长）/i), '张三')

      fireEvent.submit(screen.getByRole('button', { name: /注册/i }))

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledWith('create_family_with_templates',
          expect.objectContaining({
            p_user_locale: 'zh-CN',
          })
        )
      })

      await waitFor(() => {
        expect(window.location.href).toBe('/zh-CN/auth/verify-email?email=parent%40example.com')
      })
    })
  })

  describe('Registration - Join Family', () => {
    it('successfully joins family with invite code', async () => {
      const user = userEvent.setup()

      mockRpc
        .mockResolvedValueOnce({
          data: [{ is_valid: true, family_name: 'Existing Family', family_id: 'family-123' }],
          error: null,
        })
        .mockResolvedValueOnce({
          data: 'family-123',
          error: null,
        })

      mockSignUp.mockResolvedValue({
        data: { user: { id: 'joining-user-id' } },
        error: null,
      })

      render(<RegisterForm />)

      // Enter invite code first
      await user.type(screen.getByLabelText(/invite code/i), 'JOINCODE')

      await waitFor(() => {
        expect(screen.getByText(/✓ joining family:/i)).toBeInTheDocument()
      })

      // Fill other fields
      await user.type(screen.getByLabelText(/email/i), 'parent2@example.com')
      await user.type(screen.getByLabelText(/^password$/i), 'password123')
      await user.type(screen.getByLabelText(/confirm password/i), 'password123')
      await user.type(screen.getByLabelText(/your name \(parent\)/i), 'Jane Smith')

      fireEvent.submit(screen.getByRole('button', { name: /register/i }))

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledWith('join_family_with_invite', {
          p_invite_code: 'JOINCODE',
          p_user_id: 'joining-user-id',
          p_user_name: 'Jane Smith',
          p_user_email: 'parent2@example.com',
          p_user_locale: 'en',
        })
      })

      await waitFor(() => {
        expect(window.location.href).toBe('/en/auth/verify-email?email=parent2%40example.com')
      })
    })

    it('shows error when trying to join with unvalidated invite code', async () => {
      const user = userEvent.setup()

      mockRpc.mockResolvedValue({
        data: [{ is_valid: false }],
        error: null,
      })

      render(<RegisterForm />)

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/^password$/i), 'password123')
      await user.type(screen.getByLabelText(/confirm password/i), 'password123')
      await user.type(screen.getByLabelText(/your name \(parent\)/i), 'Test User')
      await user.type(screen.getByLabelText(/invite code/i), 'INVALID1')

      // Wait for validation to complete (invalid code)
      await waitFor(() => {
        expect(screen.getByText(/invalid or expired invite code/i)).toBeInTheDocument()
      })

      fireEvent.submit(screen.getByRole('button', { name: /register/i }))

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid invite code/i)).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('shows error when email is already registered', async () => {
      const user = userEvent.setup()

      mockSignUp.mockResolvedValue({
        data: null,
        error: { message: 'User already registered' },
      })

      render(<RegisterForm />)

      await user.type(screen.getByLabelText(/email/i), 'existing@example.com')
      await user.type(screen.getByLabelText(/^password$/i), 'password123')
      await user.type(screen.getByLabelText(/confirm password/i), 'password123')
      await user.type(screen.getByLabelText(/family name/i), 'Smith Family')
      await user.type(screen.getByLabelText(/your name \(parent\)/i), 'John')

      fireEvent.submit(screen.getByRole('button', { name: /register/i }))

      await waitFor(() => {
        expect(screen.getByText(/this email is already registered/i)).toBeInTheDocument()
      })
    })

    it('shows error when family creation fails', async () => {
      const user = userEvent.setup()

      mockSignUp.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      render(<RegisterForm />)

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/^password$/i), 'password123')
      await user.type(screen.getByLabelText(/confirm password/i), 'password123')
      await user.type(screen.getByLabelText(/family name/i), 'Smith Family')
      await user.type(screen.getByLabelText(/your name \(parent\)/i), 'John')

      fireEvent.submit(screen.getByRole('button', { name: /register/i }))

      await waitFor(() => {
        expect(screen.getByText(/database error/i)).toBeInTheDocument()
      })
    })

    it('shows generic error message for unknown errors', async () => {
      const user = userEvent.setup()

      mockSignUp.mockResolvedValue({
        data: { user: { id: 'user-id' } },
        error: null,
      })

      mockRpc.mockRejectedValue(new Error())

      render(<RegisterForm />)

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/^password$/i), 'password123')
      await user.type(screen.getByLabelText(/confirm password/i), 'password123')
      await user.type(screen.getByLabelText(/family name/i), 'Smith Family')
      await user.type(screen.getByLabelText(/your name \(parent\)/i), 'John')

      fireEvent.submit(screen.getByRole('button', { name: /register/i }))

      await waitFor(() => {
        expect(screen.getByText(/registration failed/i)).toBeInTheDocument()
      })
    })
  })

  describe('Loading States', () => {
    it('disables form while submitting', async () => {
      const user = userEvent.setup()

      mockSignUp.mockImplementation(() => new Promise(() => {})) // Never resolves

      render(<RegisterForm />)

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/^password$/i), 'password123')
      await user.type(screen.getByLabelText(/confirm password/i), 'password123')
      await user.type(screen.getByLabelText(/family name/i), 'Smith Family')
      await user.type(screen.getByLabelText(/your name \(parent\)/i), 'John')

      const submitButton = screen.getByRole('button', { name: /register/i })
      fireEvent.submit(submitButton)

      await waitFor(() => {
        expect(submitButton).toBeDisabled()
        expect(screen.getByText(/creating account/i)).toBeInTheDocument()
      })

      // All input fields should be disabled
      expect(screen.getByLabelText(/email/i)).toBeDisabled()
      expect(screen.getByLabelText(/^password$/i)).toBeDisabled()
      expect(screen.getByLabelText(/confirm password/i)).toBeDisabled()
    })

    it('disables invite code input while validating', async () => {
      const user = userEvent.setup()

      mockRpc.mockImplementation(() => new Promise(() => {})) // Never resolves

      render(<RegisterForm />)

      const inviteInput = screen.getByLabelText(/invite code/i)
      await user.type(inviteInput, 'CHECKING')

      await waitFor(() => {
        expect(inviteInput).toBeDisabled()
      })
    })
  })
})
