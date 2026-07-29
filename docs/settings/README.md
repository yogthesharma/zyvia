# Settings work handoff

Use this folder when continuing Zyvia settings work in a new Cursor thread or machine.
Laptop sessions can get heavy; prefer a fresh thread on Mac Mini and point the agent here first:

> Read `docs/settings/` before changing settings pages. Match existing patterns.

## What’s already shipped

| Area | Status | Notes |
|------|--------|-------|
| Preferences | Done | `user_preferences`, optimistic saves, sonner toasts |
| Profile | Done | Avatar via `avatars` bucket, email change, leave workspace |
| Notifications | Done | Email notification settings |
| Security & access | Done | Sessions + personal API keys |
| Connected accounts | UI only | Connect CTA → `toast("Coming soon")` |
| Workspace (Administration) | Done E2E | Logo, name, slug (+ former-slug redirects), fiscal year, region, scheduled deletion |
| Teams / Members / others | In progress / stubs | Don’t mix into workspace commits |

## Product conventions (Linear-like)

- Page chrome: `SettingsPage` + `SettingsSection` + `SettingsRow` from `components/app/settings-page.tsx`
- Client forms with per-field blur/select saves (not a single Save button)
- Toasts via `sonner` with a stable toast id per page
- Owners/admins edit workspace; owners only for delete
- Don’t expose infra names (e.g. Supabase) in user-facing copy

## Stack reminders

- Next.js App Router under `app/(app)/w/[slug]/settings/...`
- Server actions in `lib/<domain>/actions.ts`
- Queries in `lib/<domain>/queries.ts`
- Validation in `lib/<domain>/schema.ts`
- Types in `lib/<domain>/types.ts`
- Migrations in `supabase/migrations/`
- Auth gate: `requireCompletedOnboarding()`; membership often checked in page/layout

## Files in this folder

- [`connected-accounts.md`](./connected-accounts.md) — UI stub pattern
- [`workspace-settings.md`](./workspace-settings.md) — full E2E settings reference
- [`patterns.md`](./patterns.md) — checklist for building the next settings page
- [`edge-cases.md`](./edge-cases.md) — bugs we already fixed; don’t regress
