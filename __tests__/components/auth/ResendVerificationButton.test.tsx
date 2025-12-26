import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ResendVerificationButton from '@/components/auth/ResendVerificationButton'
import { act } from 'react'

// Mock the Supabase client
const mockResend = jest.fn()

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      resend: mockResend,
    },
  }),
}))

// Mock timers for cooldown testing
jest.useFakeTimers()

describe('ResendVerificationButton', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.clearAllTimers()
  })

  describe('English locale', () => {
    it('renders resend button with correct text', () => {
      render(<ResendVerificationButton email="test@example.com" locale="en" />)

      expect(screen.getByText('Resend Verification Email')).toBeInTheDocument()
    })

    it('sends verification email on click', async () => {
      mockResend.mockResolvedValue({ error: null })

      render(<ResendVerificationButton email="test@example.com" locale="en" />)

      const button = screen.getByRole('button', { name: /resend verification email/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockResend).toHaveBeenCalledWith({
          type: 'signup',
          email: 'test@example.com',
          options: {
            emailRedirectTo: expect.stringContaining('/en/auth/callback'),
          },
        })
      })
    })

    it('displays success message after sending', async () => {
      mockResend.mockResolvedValue({ error: null })

      render(<ResendVerificationButton email="test@example.com" locale="en" />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('Verification email sent! Check your inbox.')).toBeInTheDocument()
      })
    })

    it('displays error message on failure', async () => {
      mockResend.mockResolvedValue({ error: { message: 'Rate limit exceeded' } })

      render(<ResendVerificationButton email="test@example.com" locale="en" />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('Failed to send email. Please try again.')).toBeInTheDocument()
      })
    })

    it('shows 60 second cooldown after sending', async () => {
      mockResend.mockResolvedValue({ error: null })

      render(<ResendVerificationButton email="test@example.com" locale="en" />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText(/wait 60s/i)).toBeInTheDocument()
        expect(button).toBeDisabled()
      })
    })

    it('counts down cooldown timer', async () => {
      mockResend.mockResolvedValue({ error: null })

      render(<ResendVerificationButton email="test@example.com" locale="en" />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      // Should start at 60 seconds
      await waitFor(() => {
        expect(screen.getByText(/wait 60s/i)).toBeInTheDocument()
        expect(button).toBeDisabled()
      })

      // Fast forward 30 seconds
      for (let i = 0; i < 30; i++) {
        act(() => {
          jest.advanceTimersByTime(1000)
        })
      }

      // Should be at 30 seconds now
      await waitFor(() => {
        expect(screen.getByText(/wait 30s/i)).toBeInTheDocument()
        expect(button).toBeDisabled()
      })

      // Fast forward remaining 30 seconds
      for (let i = 0; i < 30; i++) {
        act(() => {
          jest.advanceTimersByTime(1000)
        })
      }

      // Cooldown should be finished
      await waitFor(() => {
        expect(button).not.toBeDisabled()
      })
    })

    it('disables button during loading', async () => {
      mockResend.mockImplementation(() => new Promise(() => {})) // Never resolves

      render(<ResendVerificationButton email="test@example.com" locale="en" />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('Sending...')).toBeInTheDocument()
        expect(button).toBeDisabled()
      })
    })
  })

  describe('Chinese locale', () => {
    it('renders resend button with Chinese text', () => {
      render(<ResendVerificationButton email="test@example.com" locale="zh-CN" />)

      expect(screen.getByText('重新发送验证邮件')).toBeInTheDocument()
    })

    it('displays Chinese success message', async () => {
      mockResend.mockResolvedValue({ error: null })

      render(<ResendVerificationButton email="test@example.com" locale="zh-CN" />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('验证邮件已发送！请查收。')).toBeInTheDocument()
      })
    })

    it('displays Chinese error message', async () => {
      mockResend.mockResolvedValue({ error: { message: 'Error' } })

      render(<ResendVerificationButton email="test@example.com" locale="zh-CN" />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('发送失败，请重试。')).toBeInTheDocument()
      })
    })

    it('shows Chinese cooldown text', async () => {
      mockResend.mockResolvedValue({ error: null })

      render(<ResendVerificationButton email="test@example.com" locale="zh-CN" />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText(/请等待 60秒/i)).toBeInTheDocument()
      })
    })

    it('shows Chinese loading text', async () => {
      mockResend.mockImplementation(() => new Promise(() => {}))

      render(<ResendVerificationButton email="test@example.com" locale="zh-CN" />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('发送中...')).toBeInTheDocument()
      })
    })
  })
})
