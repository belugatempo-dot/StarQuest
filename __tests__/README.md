# Testing Guide

## Overview

This project uses Jest and React Testing Library for automated testing.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

```
__tests__/
├── components/        # Component tests
│   ├── ui/           # UI component tests
│   └── auth/         # Authentication component tests
├── lib/              # Library/utility function tests
└── README.md         # This file
```

## Writing Tests

### Component Tests

Component tests should verify:
1. **Rendering**: Component renders without errors
2. **User Interactions**: Buttons, forms, and inputs work as expected
3. **Props**: Component behaves correctly with different props
4. **State Management**: Component state updates correctly
5. **Accessibility**: Component is accessible (ARIA labels, keyboard navigation)

Example:
```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import MyComponent from '@/components/MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('handles click events', () => {
    render(<MyComponent />)
    const button = screen.getByRole('button')
    fireEvent.click(button)
    expect(screen.getByText('Clicked')).toBeInTheDocument()
  })
})
```

### Integration Tests

Integration tests verify multiple components working together or API interactions.

### Unit Tests

Unit tests verify individual functions or utilities in isolation.

## Mocking

### Mocked Dependencies

The following are automatically mocked in `jest.setup.js`:

- **next-intl**: Translation functions return the key
- **next/navigation**: Router, pathname, and navigation hooks
- **@/lib/supabase/client**: Supabase client methods

### Custom Mocks

Create custom mocks in `__mocks__/` directory or inline in test files.

## Test Coverage

Aim for:
- **Statements**: 80%+
- **Branches**: 70%+
- **Functions**: 80%+
- **Lines**: 80%+

View coverage report:
```bash
npm run test:coverage
```

Coverage reports are generated in `coverage/` directory.

## Best Practices

1. **Test behavior, not implementation**
   - Focus on what the user sees and does
   - Don't test internal state or methods

2. **Use semantic queries**
   - Prefer `getByRole`, `getByLabelText`, `getByText`
   - Avoid `getByTestId` unless necessary

3. **Keep tests independent**
   - Each test should run in isolation
   - Don't depend on test execution order

4. **Use descriptive test names**
   - Clearly describe what is being tested
   - Use "should" or "it" format

5. **Test edge cases**
   - Empty states
   - Error conditions
   - Loading states
   - Maximum/minimum values

## Continuous Integration

Tests run automatically on:
- Pull requests
- Commits to main branch
- Pre-deployment

Ensure all tests pass before merging code.

## Debugging Tests

```bash
# Run a specific test file
npm test -- LanguageSwitcher.test.tsx

# Run tests matching a pattern
npm test -- --testNamePattern="renders login form"

# Show console.log output
npm test -- --verbose
```

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
