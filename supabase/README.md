# Supabase Setup Guide

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization
4. Fill in the project details:
   - **Name**: StarQuest (or your preferred name)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to your users
5. Click "Create new project"

## 2. Run Database Migrations

Once your project is created:

1. Go to the **SQL Editor** in your Supabase dashboard
2. Click "New Query"
3. Copy and paste the contents of `migrations/20250101000000_initial_schema.sql`
4. Click "Run" to execute
5. Repeat for `migrations/20250101000001_seed_templates.sql`

Alternatively, if you have the Supabase CLI installed:

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

## 3. Configure Environment Variables

1. In your Supabase dashboard, go to **Project Settings** > **API**
2. Copy the following values:
   - **Project URL** (under "Project URL")
   - **anon/public key** (under "Project API keys")
   - **service_role key** (under "Project API keys" - keep this secret!)

3. Create a `.env.local` file in your project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 4. Enable Authentication

1. Go to **Authentication** > **Providers** in Supabase dashboard
2. Enable **Email** provider
3. Configure email templates if desired (optional)

## 5. Verify Setup

1. Check that all tables are created:
   - families
   - users
   - quests
   - star_transactions
   - rewards
   - redemptions
   - levels

2. Check that the view exists:
   - child_balances

3. Verify RLS policies are enabled on all tables

## Database Schema Overview

### Tables

- **families**: Family groups
- **users**: Both parents and children
- **quests**: Task templates (positive and negative behaviors)
- **star_transactions**: Record of stars earned/deducted
- **rewards**: Reward templates that can be redeemed
- **redemptions**: Record of reward redemptions
- **levels**: Level/rank definitions

### Views

- **child_balances**: Computed view showing current and lifetime stars for each child

### Functions

- **initialize_family_templates(family_id)**: Inserts default quests, rewards, and levels for a new family
- **create_family_with_templates(...)**: Creates a new family with parent user and initializes templates

## Security

All tables have Row Level Security (RLS) enabled with the following rules:

- **Parents**: Full access to all family data
- **Children**: Can read family data, create star/redemption requests
- **Isolation**: Users can only access their own family's data

## Next Steps

After setting up Supabase:

1. Copy your environment variables to `.env.local`
2. Test the connection by running the development server
3. Try registering a new family to test the setup

## Troubleshooting

### "relation does not exist" error
- Make sure you ran both migration files in order
- Check that you're in the correct project/database

### RLS policy errors
- Verify that RLS is enabled on all tables
- Check that the policies were created successfully
- Review the policy conditions match your auth setup

### Authentication issues
- Verify email provider is enabled
- Check environment variables are correct
- Ensure `.env.local` is not in `.gitignore` (it should be!)
