import { render, screen, fireEvent } from '@testing-library/react'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'

describe('LanguageSwitcher', () => {
  it('renders language buttons', () => {
    render(<LanguageSwitcher />)

    expect(screen.getByText('EN')).toBeInTheDocument()
    expect(screen.getByText('中文')).toBeInTheDocument()
  })

  it('highlights the current language', () => {
    // Mock pathname to return a specific locale
    jest.spyOn(require('next/navigation'), 'usePathname').mockReturnValue('/en/app')

    render(<LanguageSwitcher />)

    const enButton = screen.getByText('EN')
    expect(enButton).toHaveClass('bg-primary')
  })

  it('switches language on button click', () => {
    const mockPush = jest.fn()
    jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue({
      push: mockPush,
    })

    render(<LanguageSwitcher />)

    const zhButton = screen.getByText('中文')
    fireEvent.click(zhButton)

    // Should navigate to Chinese version
    expect(mockPush).toHaveBeenCalled()
  })
})
