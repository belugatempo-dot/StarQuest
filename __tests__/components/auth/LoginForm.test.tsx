import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginForm from '@/components/auth/LoginForm'

// Mock the Supabase client
const mockSignIn = jest.fn()
const mockFrom = jest.fn()

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: mockSignIn,
    },
    from: mockFrom,
  }),
}))

// Mock next/navigation
let mockPathname = '/en/login'
const mockRouter = { push: jest.fn() }

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: jest.fn(() => mockPathname),
  useSearchParams: () => new URLSearchParams(),
}))

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPathname = '/en/login' // Reset to English
  })

  it('renders login form fields', () => {
    render(<LoginForm />)

    expect(screen.getByLabelText(/auth.email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/auth.password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /common.login/i })).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    render(<LoginForm />)

    const submitButton = screen.getByRole('button', { name: /common.login/i })
    fireEvent.click(submitButton)

    // Form should not submit without values
    expect(mockSignIn).not.toHaveBeenCalled()
  })

  it('submits form with valid credentials', async () => {
    const user = userEvent.setup()

    mockSignIn.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    })

    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { role: 'parent', family_id: 'test-family-id' },
        error: null
      }),
    }

    mockFrom.mockReturnValue(mockChain)

    render(<LoginForm />)

    const emailInput = screen.getByLabelText(/auth.email/i)
    const passwordInput = screen.getByLabelText(/auth.password/i)
    const submitButton = screen.getByRole('button', { name: /common.login/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })
  })

  it('displays error message on login failure', async () => {
    const user = userEvent.setup()

    mockSignIn.mockResolvedValue({
      data: null,
      error: { message: 'Invalid credentials' },
    })

    render(<LoginForm />)

    const emailInput = screen.getByLabelText(/auth.email/i)
    const passwordInput = screen.getByLabelText(/auth.password/i)
    const submitButton = screen.getByRole('button', { name: /common.login/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'wrongpassword')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
    })
  })

  it('disables submit button while loading', async () => {
    const user = userEvent.setup()

    mockSignIn.mockImplementation(() => new Promise(() => {})) // Never resolves

    render(<LoginForm />)

    const emailInput = screen.getByLabelText(/auth.email/i)
    const passwordInput = screen.getByLabelText(/auth.password/i)
    const submitButton = screen.getByRole('button', { name: /common.login/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(submitButton).toBeDisabled()
      expect(screen.getByText(/common.loading/i)).toBeInTheDocument()
    })
  })

  describe('Email Verification', () => {
    it('shows localized error when email not confirmed (English)', async () => {
      const user = userEvent.setup()

      mockSignIn.mockResolvedValue({
        data: null,
        error: { message: 'Email not confirmed' },
      })

      // Pathname already set to English in beforeEach
      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/auth.email/i)
      const passwordInput = screen.getByLabelText(/auth.password/i)
      const submitButton = screen.getByRole('button', { name: /common.login/i })

      await user.type(emailInput, 'unverified@example.com')
      await user.type(passwordInput, 'password123')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/your email is not verified/i)).toBeInTheDocument()
      })
    })

    it('shows localized error when email not confirmed (Chinese)', async () => {
      const user = userEvent.setup()

      mockSignIn.mockResolvedValue({
        data: null,
        error: { message: 'Email not confirmed' },
      })

      // Set pathname to Chinese locale
      mockPathname = '/zh-CN/login'

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/auth.email/i)
      const passwordInput = screen.getByLabelText(/auth.password/i)
      const submitButton = screen.getByRole('button', { name: /common.login/i })

      await user.type(emailInput, 'unverified@example.com')
      await user.type(passwordInput, 'password123')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/您的邮箱尚未验证/i)).toBeInTheDocument()
      })
    })

    it('shows resend verification button on email not confirmed error', async () => {
      const user = userEvent.setup()

      mockSignIn.mockResolvedValue({
        data: null,
        error: { message: 'Email not confirmed' },
      })

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/auth.email/i)
      const passwordInput = screen.getByLabelText(/auth.password/i)
      const submitButton = screen.getByRole('button', { name: /common.login/i })

      await user.type(emailInput, 'unverified@example.com')
      await user.type(passwordInput, 'password123')
      fireEvent.click(submitButton)

      await waitFor(() => {
        // Check that ResendVerificationButton is rendered
        const resendButton = screen.getByRole('button', { name: /resend verification email/i })
        expect(resendButton).toBeInTheDocument()
      })
    })

    it('does not show resend button for other errors', async () => {
      const user = userEvent.setup()

      mockSignIn.mockResolvedValue({
        data: null,
        error: { message: 'Invalid credentials' },
      })

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/auth.email/i)
      const passwordInput = screen.getByLabelText(/auth.password/i)
      const submitButton = screen.getByRole('button', { name: /common.login/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'wrongpassword')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
      })

      // Resend button should NOT be present
      expect(screen.queryByRole('button', { name: /resend verification email/i })).not.toBeInTheDocument()
    })
  })

  describe('Role-Based Redirection', () => {
    beforeEach(() => {
      // Mock window.location.href
      delete (window as any).location
      ;(window as any).location = { href: '' }
    })

    it('redirects parent users to /admin using hard navigation', async () => {
      const user = userEvent.setup()

      mockSignIn.mockResolvedValue({
        data: { user: { id: 'parent-user-id' } },
        error: null,
      })

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { role: 'parent', family_id: 'family-123' },
          error: null,
        }),
      }

      mockFrom.mockReturnValue(mockChain)

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/auth.email/i)
      const passwordInput = screen.getByLabelText(/auth.password/i)
      const submitButton = screen.getByRole('button', { name: /common.login/i })

      await user.type(emailInput, 'parent@example.com')
      await user.type(passwordInput, 'password123')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(window.location.href).toBe('/en/admin')
      })

      // Should NOT use router.push
      expect(mockRouter.push).not.toHaveBeenCalled()
    })

    it('redirects child users to /app using hard navigation', async () => {
      const user = userEvent.setup()

      mockSignIn.mockResolvedValue({
        data: { user: { id: 'child-user-id' } },
        error: null,
      })

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { role: 'child', family_id: 'family-123' },
          error: null,
        }),
      }

      mockFrom.mockReturnValue(mockChain)

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/auth.email/i)
      const passwordInput = screen.getByLabelText(/auth.password/i)
      const submitButton = screen.getByRole('button', { name: /common.login/i })

      await user.type(emailInput, 'child@example.com')
      await user.type(passwordInput, 'password123')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(window.location.href).toBe('/en/app')
      })

      // Should NOT use router.push
      expect(mockRouter.push).not.toHaveBeenCalled()
    })

    it('redirects to correct locale path (Chinese)', async () => {
      const user = userEvent.setup()
      mockPathname = '/zh-CN/login'

      mockSignIn.mockResolvedValue({
        data: { user: { id: 'parent-user-id' } },
        error: null,
      })

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { role: 'parent', family_id: 'family-123' },
          error: null,
        }),
      }

      mockFrom.mockReturnValue(mockChain)

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/auth.email/i)
      const passwordInput = screen.getByLabelText(/auth.password/i)
      const submitButton = screen.getByRole('button', { name: /common.login/i })

      await user.type(emailInput, 'parent@example.com')
      await user.type(passwordInput, 'password123')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(window.location.href).toBe('/zh-CN/admin')
      })
    })
  })

  describe('User Record Error Handling', () => {
    it('shows error when user record not found (English)', async () => {
      const user = userEvent.setup()

      mockSignIn.mockResolvedValue({
        data: { user: { id: 'orphan-user-id' } },
        error: null,
      })

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'User not found' },
        }),
      }

      mockFrom.mockReturnValue(mockChain)

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/auth.email/i)
      const passwordInput = screen.getByLabelText(/auth.password/i)
      const submitButton = screen.getByRole('button', { name: /common.login/i })

      await user.type(emailInput, 'orphan@example.com')
      await user.type(passwordInput, 'password123')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/user record not found/i)).toBeInTheDocument()
        expect(screen.getByText(/complete registration →/i)).toBeInTheDocument()
      })
    })

    it('shows error when user record not found (Chinese)', async () => {
      const user = userEvent.setup()
      mockPathname = '/zh-CN/login'

      mockSignIn.mockResolvedValue({
        data: { user: { id: 'orphan-user-id' } },
        error: null,
      })

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'User not found' },
        }),
      }

      mockFrom.mockReturnValue(mockChain)

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/auth.email/i)
      const passwordInput = screen.getByLabelText(/auth.password/i)
      const submitButton = screen.getByRole('button', { name: /common.login/i })

      await user.type(emailInput, 'orphan@example.com')
      await user.type(passwordInput, 'password123')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/找不到用户记录/i)).toBeInTheDocument()
        expect(screen.getByText(/重新完成注册 →/i)).toBeInTheDocument()
      })
    })

    it('shows link to registration page when user record not found', async () => {
      const user = userEvent.setup()

      mockSignIn.mockResolvedValue({
        data: { user: { id: 'orphan-user-id' } },
        error: null,
      })

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'User not found' },
        }),
      }

      mockFrom.mockReturnValue(mockChain)

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/auth.email/i)
      const passwordInput = screen.getByLabelText(/auth.password/i)
      const submitButton = screen.getByRole('button', { name: /common.login/i })

      await user.type(emailInput, 'orphan@example.com')
      await user.type(passwordInput, 'password123')
      fireEvent.click(submitButton)

      await waitFor(() => {
        const registerLink = screen.getByRole('link', { name: /complete registration →/i })
        expect(registerLink).toHaveAttribute('href', '/en/register')
      })
    })

    it('shows error when user has no family_id', async () => {
      const user = userEvent.setup()

      mockSignIn.mockResolvedValue({
        data: { user: { id: 'no-family-user-id' } },
        error: null,
      })

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { role: 'parent', family_id: null },
          error: null,
        }),
      }

      mockFrom.mockReturnValue(mockChain)

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/auth.email/i)
      const passwordInput = screen.getByLabelText(/auth.password/i)
      const submitButton = screen.getByRole('button', { name: /common.login/i })

      await user.type(emailInput, 'nofamily@example.com')
      await user.type(passwordInput, 'password123')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/please complete family setup/i)).toBeInTheDocument()
      })
    })
  })
})
