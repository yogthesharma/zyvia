# Patterns for the next settings page

Use this checklist so new settings match Preferences / Profile / Workspace.

## 1. Page (server)

```tsx
// app/(app)/w/[slug]/settings/<feature>/page.tsx
export default async function Page({ params }) {
  const { slug } = await params
  const { user } = await requireCompletedOnboarding()
  const data = await getThing(slug, user.id)
  if (!data) notFound()
  return <ThingForm initial={data} />
}
```

- Catch unexpected query errors → `notFound()` (don’t 500 the shell)
- Validate slug with `isValidWorkspaceSlug` in queries when loading by slug

## 2. Domain module

```
lib/<feature>/
  types.ts
  schema.ts      # parse/normalize; never trust client
  queries.ts     # read models for the form
  actions.ts     # "use server"; return { error?, data?, redirectTo? }
```

## 3. Form (client)

- `SettingsPage` / `SettingsSection` / `SettingsRow`
- Subpages with a back control: wrap in `SettingsSubpage` (`backHref` + `backLabel`) — sticky top-left, shared with create-team / agent skill / team hub
- Local state + `ref` for latest committed model
- Per-field pending `Set` + request id race guards
- `toast.success` / `toast.error` with one toast id
- Optimistic update only the field being saved; rollback that field on error
- `router.refresh()` after successful mutations that affect layout/sidebar

## 4. Storage uploads (if any)

- Dedicated public bucket + RLS scoped to owner/admin (or user id for profile)
- Size + MIME allowlist server-side
- Extension fallback when `file.type` is empty
- Cache-bust public URL with `?v=${Date.now()}`
- Clean leftover objects when replacing formats

## 5. Migrations

- Additive columns with defaults for existing rows
- Triggers for immutability when needed (see workspace `region`)
- Keep RLS aligned with UI permissions
- Apply to remote DB when shipping (this project often applies via `postgres` + `POSTGRES_URL_NON_POOLING`)

## 6. Commits

- Only stage files for the feature you’re shipping
- Leave unrelated WIP (teams, icon-picker, lockfile churn) out of the commit
- Prefer `main` as the working branch in this repo

## 7. Prompt starter for a new thread

```
Read docs/settings/README.md and docs/settings/patterns.md.
Implement <settings page> end-to-end like workspace settings.
Use SettingsPage/Section/Row, lib/<domain> actions/queries/schema,
sonner toasts, and a migration if the schema needs fields.
Do not mention Supabase/infra in user-facing copy.
```
