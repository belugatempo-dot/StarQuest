# Adding SUPABASE_DB_URL as a GitHub Repository Secret

## Via GitHub UI

1. Go to <https://github.com/belugatempo-dot/StarQuest/settings/secrets/actions>
2. Click **New repository secret**
3. Name: `SUPABASE_DB_URL`
4. Value: your connection string (`postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres`)
5. Click **Add secret**

Find the connection string in **Supabase Dashboard > Settings > Database > Connection string** (URI format).

## Via CLI

```bash
gh secret set SUPABASE_DB_URL
```

This prompts you to paste the value interactively (it won't echo to the terminal).
