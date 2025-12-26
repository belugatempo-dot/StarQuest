# Development Guide

This guide contains important information for developers working on StarQuest.

---

## 🛠️ Development Setup

### First Time Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up Supabase**
   - Create a Supabase project
   - Run migrations from `supabase/migrations/`
   - Get your API credentials

3. **Environment variables**
   ```bash
   cp .env.example .env.local
   ```

   Fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

4. **Start development**
   ```bash
   npm run dev
   ```

---

## 📂 File Organization

### When to create new files

- **Components**: Create in appropriate subfolder (`ui/`, `auth/`, `child/`, `admin/`)
- **Pages**: Create in `app/[locale]/` with proper route groups
- **Utilities**: Add to `lib/` folder
- **Types**: Add to `types/` folder
- **Hooks**: Add to `hooks/` folder

### Naming Conventions

- **Components**: PascalCase (e.g., `ChildNav.tsx`)
- **Utilities**: camelCase (e.g., `auth.ts`)
- **Types**: PascalCase for types, lowercase for files (e.g., `database.ts`)
- **Test files**: Match source file + `.test.tsx` (e.g., `LoginForm.test.tsx`)

---

## 🎨 Styling Guidelines

### Tailwind Usage

Always use Tailwind utility classes. Avoid custom CSS unless absolutely necessary.

**Good:**
```tsx
<button className="bg-primary hover:bg-primary/90 px-4 py-2 rounded">
  Click me
</button>
```

**Avoid:**
```tsx
<button style={{ backgroundColor: '#FFD700' }}>
  Click me
</button>
```

### Theme Colors

Use semantic color names from the Tailwind config:
- `bg-primary` - Gold/Stars color
- `bg-secondary` - Indigo/Professional color
- `bg-success` - Green for positive actions
- `bg-warning` - Orange for warnings
- `bg-danger` - Red for negative actions

### Responsive Design

Always consider mobile-first:
```tsx
<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Mobile: 1 column, Tablet: 2 columns, Desktop: 3 columns */}
</div>
```

---

## 🌍 Internationalization

### Adding New Translations

1. Add keys to both `messages/en.json` and `messages/zh-CN.json`
2. Use the `useTranslations` hook in components:

```tsx
import { useTranslations } from 'next-intl';

export default function MyComponent() {
  const t = useTranslations();

  return <h1>{t('dashboard.title')}</h1>;
}
```

### Translation Key Structure

Organize by feature/section:
```json
{
  "dashboard": {
    "title": "Dashboard",
    "currentBalance": "Current Balance"
  },
  "quests": {
    "title": "Quests",
    "availableQuests": "Available Quests"
  }
}
```

### User-Generated Content

Do NOT translate user-generated content (quest names, reward names, notes).

---

## 🗄️ Database Guidelines

### Querying Data

Always use Supabase client from the appropriate context:

**Server Components:**
```tsx
import { createClient } from '@/lib/supabase/server';

const supabase = await createClient();
const { data } = await supabase.from('quests').select('*');
```

**Client Components:**
```tsx
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();
const { data } = await supabase.from('quests').select('*');
```

### RLS (Row Level Security)

- All tables have RLS enabled
- Policies handle permissions automatically
- Trust the RLS policies - don't add extra checks in code
- Test with different user roles

### Type Safety

Use database types from `types/database.ts`:

```tsx
import type { Database } from '@/types/database';

type Quest = Database['public']['Tables']['quests']['Row'];
```

---

## 🧪 Testing

### Writing Tests

Every new component should have tests covering:
1. Rendering without errors
2. Key user interactions
3. Edge cases (loading, errors, empty states)

### Test Naming

Use descriptive names:
```tsx
it('displays error message when login fails', () => {
  // test code
});
```

### Running Tests

```bash
# All tests
npm test

# Specific file
npm test -- LoginForm.test.tsx

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### Mocking

Common mocks are in `jest.setup.js`:
- next-intl
- next/navigation
- Supabase client

Add custom mocks as needed in test files.

---

## 🔐 Authentication

### Protecting Routes

**Server Components:**
```tsx
import { requireAuth, requireParent } from '@/lib/auth';

export default async function ProtectedPage({ params }) {
  const { locale } = await params;

  // Requires any authenticated user
  const user = await requireAuth(locale);

  // OR requires parent role
  const parent = await requireParent(locale);

  return <div>Protected content</div>;
}
```

**Client Components:**
```tsx
import { useUser } from '@/hooks/useUser';

export default function MyComponent() {
  const { user, loading } = useUser();

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Not authenticated</div>;

  return <div>Hello {user.name}</div>;
}
```

---

## 🚀 Performance

### Image Optimization

Use Next.js Image component:
```tsx
import Image from 'next/image';

<Image
  src="/avatar.jpg"
  alt="Avatar"
  width={48}
  height={48}
  className="rounded-full"
/>
```

### Data Fetching

- Use Server Components for initial data
- Use Client Components + hooks for interactive data
- Implement loading states
- Handle errors gracefully

### Caching

Next.js handles caching automatically for Server Components. For dynamic data:

```tsx
// Opt out of caching
export const dynamic = 'force-dynamic';

// Or set revalidation time
export const revalidate = 3600; // 1 hour
```

---

## 🐛 Debugging

### Development Tools

1. **React DevTools**: Inspect component tree
2. **Next.js DevTools**: Analyze routes and performance
3. **Supabase Dashboard**: View database and logs
4. **Browser Console**: Check for errors and logs

### Common Issues

**"Locale not found"**
- Check middleware.ts is working
- Ensure URL starts with `/en/` or `/zh-CN/`

**RLS Policy Errors**
- Verify user is authenticated
- Check user has correct role
- Review policy conditions in SQL

**"Cannot read property of undefined"**
- Add null checks for database queries
- Handle loading and error states

---

## 📦 Building for Production

### Build Check

```bash
npm run build
```

This will:
- Type check all files
- Build the Next.js app
- Optimize assets
- Generate static pages where possible

### Pre-deployment Checklist

- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] Environment variables set in Vercel
- [ ] Database migrations applied
- [ ] RLS policies verified
- [ ] Performance tested
- [ ] Mobile responsive
- [ ] Both languages work

---

## 🔄 Git Workflow

### Commit Messages

Use conventional commits:
```
feat: add quest deletion feature
fix: resolve star calculation bug
docs: update setup instructions
test: add tests for reward redemption
style: format admin dashboard
refactor: simplify auth logic
```

### Before Committing

1. Run tests: `npm test`
2. Run linter: `npm run lint`
3. Check types: `npm run build`

---

## 📚 Useful Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [next-intl](https://next-intl-docs.vercel.app/)
- [React Testing Library](https://testing-library.com/react)

---

## 💡 Tips & Best Practices

1. **Keep components small**: Split into smaller pieces if >200 lines
2. **Server vs Client**: Use Server Components by default, Client only when needed
3. **Type everything**: Don't use `any` type
4. **Error handling**: Always handle loading and error states
5. **Accessibility**: Use semantic HTML and ARIA labels
6. **Mobile first**: Design for mobile, enhance for desktop
7. **Test user flows**: Test complete user journeys, not just units

---

## 🤝 Getting Help

- Check PRD.md for requirements
- Review existing code for patterns
- Search Supabase docs for database questions
- Test in development before asking

---

Happy coding! 🎉
