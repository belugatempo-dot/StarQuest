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
      single: jest.fn().mockResolvedValue({ data: { role: 'parent' }, error: null }),
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
})
