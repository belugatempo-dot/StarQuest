# Fix npm Audit Vulnerabilities (28 → 0)

## Context

`npm audit` reports 28 vulnerabilities (5 moderate, 22 high, 1 critical) after Vercel deploy. Two root causes:

1. **`next@15.5.9`** — 2 high severity (DoS via Image Optimizer, DoS via RSC deserialization). Fix: update to `15.5.12`.
2. **`vercel@50.23.2`** — 26 vulnerabilities in its sub-dependencies (`ajv`, `minimatch`, `path-to-regexp`, `tar`, `undici`, `basic-ftp`). **`vercel` is only used as a CLI deployment tool and is never imported in code.** It should be a global install or run via `npx`, not a project dependency.

## Plan

### Step 1: Remove `vercel` from project dependencies

`vercel` is a CLI tool — it doesn't belong in `dependencies`. No source file imports it. Removing it eliminates 26 of 28 vulnerabilities instantly.

```bash
npm uninstall vercel
```

For future deployments, use the globally installed `vercel` CLI (already installed — `vercel --version` works) or `npx vercel`.

### Step 2: Run `npm audit fix` for remaining Next.js vulnerabilities

```bash
npm audit fix
```

This safely patches:
- `next` 15.5.9 → 15.5.12 (fixes 2 high-severity DoS vulns)
- `minimatch`, `ajv`, `basic-ftp` patches (transitive, non-breaking)

### Step 3: Verify

```bash
npm audit              # Should show 0 vulnerabilities
npm test               # All 2992+ tests pass
npm run build          # Production build succeeds
vercel --version       # Global CLI still available
```

## Files Modified

- `package.json` — remove `vercel` from `dependencies`
- `package-lock.json` — auto-updated by npm

## Risk Assessment

- **Low risk**: `vercel` is never imported in code; only used as a CLI command. Removing it from `dependencies` has zero impact on the app — it just stops bundling it into `node_modules`.
- The global `vercel` CLI (or `npx vercel`) handles deployments identically.

## Execution Results

| Check | Result |
|-------|--------|
| `npm audit` | **0 vulnerabilities** (was 28) |
| `npm test` | **2994 tests passing** (144 suites) |
| `npm run build` | **Success** |
| `vercel --version` | **v50.4.5** (global CLI works) |
