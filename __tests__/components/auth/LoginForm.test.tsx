import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginForm from '@/components/auth/LoginForm'

// Mock the Supabase client
const mockSignIn = jest.fn()
const mockFrom = jest.fn()
const mockVerifyOtp = jest.fn()

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: mockSignIn,
      verifyOtp: mockVerifyOtp,
    },
    from: mockFrom,
  }),
}))

// Mock global fetch for demo-login API calls
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock next/navigation
let mockPathname = '/en/login'
let mockSearchParams = new URLSearchParams()
const mockRouter = { push: jest.fn() }

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: jest.fn(() => mockPathname),
  useSearchParams: () => mockSearchParams,
}))

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPathname = '/en/login' // Reset to English
    mockSearchParams = new URLSearchParams() // Reset search params
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
        expect(screen.getByText('auth.emailNotVerified')).toBeInTheDocument()
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
        expect(screen.getByText('auth.emailNotVerified')).toBeInTheDocument()
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

    it('redirects parent users to /activities using hard navigation', async () => {
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
        expect(window.location.href).toBe('/en/activities')
      })

      // Should NOT use router.push
      expect(mockRouter.push).not.toHaveBeenCalled()
    })

    it('redirects child users to /activities using hard navigation', async () => {
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
        expect(window.location.href).toBe('/en/activities')
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
        expect(window.location.href).toBe('/zh-CN/activities')
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
        expect(screen.getByText('auth.userRecordNotFound')).toBeInTheDocument()
        expect(screen.getByText('auth.completeRegistration')).toBeInTheDocument()
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
        expect(screen.getByText('auth.userRecordNotFound')).toBeInTheDocument()
        expect(screen.getByText('auth.completeRegistration')).toBeInTheDocument()
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
        const registerLink = screen.getByRole('link', { name: 'auth.completeRegistration' })
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
        expect(screen.getByText('auth.familySetupRequired')).toBeInTheDocument()
      })
    })

    it('does not show registration link for generic errors', async () => {
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

      expect(screen.queryByRole('link', { name: 'auth.completeRegistration' })).not.toBeInTheDocument()
    })
  })

  describe('Null User Handling', () => {
    it('shows error when signIn succeeds but data.user is null', async () => {
      const user = userEvent.setup()

      mockSignIn.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/auth.email/i)
      const passwordInput = screen.getByLabelText(/auth.password/i)
      const submitButton = screen.getByRole('button', { name: /common.login/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('auth.loginFailed')).toBeInTheDocument()
      })
    })
  })

  describe('Demo Mode — Role Picker', () => {
    beforeEach(() => {
      mockSearchParams = new URLSearchParams('demo=true')
      mockFetch.mockReset()
      mockVerifyOtp.mockReset()
      delete (window as any).location
      ;(window as any).location = { href: '' }
    })

    it('renders role picker instead of email/password form when demo=true', () => {
      render(<LoginForm />)

      // Role picker should be visible
      expect(screen.getByText('demo.pickRole')).toBeInTheDocument()
      expect(screen.getByText('demo.pickRoleHint')).toBeInTheDocument()

      // 3 role cards: Parent, Alisa, Alexander
      expect(screen.getByText('Parent')).toBeInTheDocument()
      expect(screen.getByText('Alisa')).toBeInTheDocument()
      expect(screen.getByText('Alexander')).toBeInTheDocument()

      // Email and password fields should NOT be visible
      expect(screen.queryByLabelText(/auth.email/i)).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/auth.password/i)).not.toBeInTheDocument()
    })

    it('does not show role picker when demo param is absent', () => {
      mockSearchParams = new URLSearchParams()
      render(<LoginForm />)

      expect(screen.queryByText('demo.pickRole')).not.toBeInTheDocument()
      expect(screen.getByLabelText(/auth.email/i)).toBeInTheDocument()
    })

    it('calls /api/demo-login and verifyOtp for parent role, redirects to /activities', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ token_hash: 'tok_abc', email: 'demo@starquest.app' }),
      })
      mockVerifyOtp.mockResolvedValue({ error: null })

      render(<LoginForm />)

      const parentButton = screen.getByRole('button', { name: /Parent/i })
      fireEvent.click(parentButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/demo-login', expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ role: 'parent' }),
        }))
      })

      await waitFor(() => {
        expect(mockVerifyOtp).toHaveBeenCalledWith({
          token_hash: 'tok_abc',
          type: 'magiclink',
        })
      })

      await waitFor(() => {
        expect(window.location.href).toBe('/en/activities')
      })
    })

    it('redirects child role (alisa) to /activities', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ token_hash: 'tok_alisa', email: 'alisa.demo@starquest.app' }),
      })
      mockVerifyOtp.mockResolvedValue({ error: null })

      render(<LoginForm />)

      const alisaButton = screen.getByRole('button', { name: /Alisa/i })
      fireEvent.click(alisaButton)

      await waitFor(() => {
        expect(window.location.href).toBe('/en/activities')
      })
    })

    it('shows error when API returns error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Demo login not available' }),
      })

      render(<LoginForm />)

      const parentButton = screen.getByRole('button', { name: /Parent/i })
      fireEvent.click(parentButton)

      await waitFor(() => {
        expect(screen.getByText('Demo login not available')).toBeInTheDocument()
      })
    })

    it('shows error when verifyOtp fails', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ token_hash: 'tok_abc', email: 'demo@starquest.app' }),
      })
      mockVerifyOtp.mockResolvedValue({ error: { message: 'Token expired' } })

      render(<LoginForm />)

      const parentButton = screen.getByRole('button', { name: /Parent/i })
      fireEvent.click(parentButton)

      await waitFor(() => {
        expect(screen.getByText('Token expired')).toBeInTheDocument()
      })
    })

    it('disables all role cards while loading', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

      render(<LoginForm />)

      const parentButton = screen.getByRole('button', { name: /Parent/i })
      fireEvent.click(parentButton)

      await waitFor(() => {
        // All buttons should be disabled
        const buttons = screen.getAllByRole('button')
        buttons.forEach(btn => expect(btn).toBeDisabled())
      })
    })

    it('shows loading indicator on the clicked role card', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

      render(<LoginForm />)

      const parentButton = screen.getByRole('button', { name: /Parent/i })
      fireEvent.click(parentButton)

      await waitFor(() => {
        expect(screen.getByText('common.loading')).toBeInTheDocument()
      })
    })

    it('redirects alexander role to /activities', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ token_hash: 'tok_alexander', email: 'alexander.demo@starquest.app' }),
      })
      mockVerifyOtp.mockResolvedValue({ error: null })

      render(<LoginForm />)

      const alexanderButton = screen.getByRole('button', { name: /Alexander/i })
      fireEvent.click(alexanderButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/demo-login', expect.objectContaining({
          body: JSON.stringify({ role: 'alexander' }),
        }))
      })

      await waitFor(() => {
        expect(window.location.href).toBe('/en/activities')
      })
    })

    it('uses Chinese locale path when pathname is zh-CN', async () => {
      mockPathname = '/zh-CN/login'
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ token_hash: 'tok_zh', email: 'demo@starquest.app' }),
      })
      mockVerifyOtp.mockResolvedValue({ error: null })

      render(<LoginForm />)

      const parentButton = screen.getByRole('button', { name: /家长/i })
      fireEvent.click(parentButton)

      await waitFor(() => {
        expect(window.location.href).toBe('/zh-CN/activities')
      })
    })

    it('shows Chinese role names when locale is zh-CN', () => {
      mockPathname = '/zh-CN/login'
      render(<LoginForm />)

      expect(screen.getByText('家长')).toBeInTheDocument()
      expect(screen.getByText('管理任务、审批星星、查看报告')).toBeInTheDocument()
    })

    it('handles network error during demo login', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      render(<LoginForm />)

      const parentButton = screen.getByRole('button', { name: /Parent/i })
      fireEvent.click(parentButton)

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })

    it('shows fallback error when API returns ok:false with empty error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ error: '' }),
      })

      render(<LoginForm />)

      const parentButton = screen.getByRole('button', { name: /Parent/i })
      fireEvent.click(parentButton)

      await waitFor(() => {
        expect(screen.getByText('Demo login failed')).toBeInTheDocument()
      })
    })

    it('shows fallback error when non-Error is thrown', async () => {
      mockFetch.mockRejectedValue('string error')

      render(<LoginForm />)

      const parentButton = screen.getByRole('button', { name: /Parent/i })
      fireEvent.click(parentButton)

      await waitFor(() => {
        expect(screen.getByText('Demo login failed')).toBeInTheDocument()
      })
    })

    it('re-enables buttons after error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Some error' }),
      })

      render(<LoginForm />)

      const parentButton = screen.getByRole('button', { name: /Parent/i })
      fireEvent.click(parentButton)

      await waitFor(() => {
        expect(screen.getByText('Some error')).toBeInTheDocument()
      })

      // Buttons should be re-enabled after error
      await waitFor(() => {
        expect(parentButton).not.toBeDisabled()
      })
    })
  })

  describe('Form Input Attributes', () => {
    it('email input has correct type and required attribute', () => {
      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/auth.email/i)
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toHaveAttribute('required')
      expect(emailInput).toHaveAttribute('placeholder', 'you@example.com')
    })

    it('password input has correct type and required attribute', () => {
      render(<LoginForm />)

      const passwordInput = screen.getByLabelText(/auth.password/i)
      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(passwordInput).toHaveAttribute('required')
      expect(passwordInput).toHaveAttribute('placeholder', '••••••••')
    })

    it('labels are properly associated with inputs', () => {
      render(<LoginForm />)

      const emailLabel = screen.getByText(/auth.email/i)
      const passwordLabel = screen.getByText(/auth.password/i)

      expect(emailLabel).toHaveAttribute('for', 'email')
      expect(passwordLabel).toHaveAttribute('for', 'password')
    })
  })

  describe('Error State Management', () => {
    it('clears error when starting new login attempt', async () => {
      const user = userEvent.setup()

      // First attempt - fail
      mockSignIn.mockResolvedValueOnce({
        data: null,
        error: { message: 'First error' },
      })

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/auth.email/i)
      const passwordInput = screen.getByLabelText(/auth.password/i)
      const submitButton = screen.getByRole('button', { name: /common.login/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('First error')).toBeInTheDocument()
      })

      // Second attempt - error should clear immediately
      mockSignIn.mockImplementation(() => new Promise(() => {})) // Never resolves

      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.queryByText('First error')).not.toBeInTheDocument()
      })
    })

    it('clears showRegistrationLink on new login attempt', async () => {
      const user = userEvent.setup()

      mockSignIn.mockResolvedValue({
        data: { user: { id: 'orphan-user-id' } },
        error: null,
      })

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValueOnce({
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
        expect(screen.getByRole('link', { name: 'auth.completeRegistration' })).toBeInTheDocument()
      })

      // On second attempt, registration link should clear
      mockSignIn.mockImplementation(() => new Promise(() => {}))
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.queryByRole('link', { name: 'auth.completeRegistration' })).not.toBeInTheDocument()
      })
    })
  })

  describe('Double Submit Prevention', () => {
    it('prevents multiple submissions while loading', async () => {
      const user = userEvent.setup()

      let resolvePromise: (value: any) => void
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockSignIn.mockReturnValue(pendingPromise)

      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/auth.email/i)
      const passwordInput = screen.getByLabelText(/auth.password/i)
      const submitButton = screen.getByRole('button', { name: /common.login/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')

      // First click
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(submitButton).toBeDisabled()
      })

      // Additional clicks while disabled
      fireEvent.click(submitButton)
      fireEvent.click(submitButton)

      // Should only be called once
      expect(mockSignIn).toHaveBeenCalledTimes(1)

      // Cleanup
      resolvePromise!({ data: null, error: { message: 'Error' } })
    })
  })

  describe('Controlled Input Behavior', () => {
    it('updates email state on input change', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/auth.email/i) as HTMLInputElement

      await user.type(emailInput, 'new@email.com')

      expect(emailInput.value).toBe('new@email.com')
    })

    it('updates password state on input change', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)

      const passwordInput = screen.getByLabelText(/auth.password/i) as HTMLInputElement

      await user.type(passwordInput, 'secret123')

      expect(passwordInput.value).toBe('secret123')
    })
  })
})
