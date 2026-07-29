# Workspace settings (Administration)

**Route:** `/w/[slug]/settings/workspace`  
**Status:** End-to-end (UI + DB + storage + actions)

## Files

| Layer | Path |
|-------|------|
| Page | `app/(app)/w/[slug]/settings/workspace/page.tsx` |
| Form | `components/settings/workspace-form.tsx` |
| Actions | `lib/workspace/actions.ts` |
| Queries | `lib/workspace/queries.ts` |
| Schema | `lib/workspace/schema.ts` |
| Region | `lib/workspace/region.ts` |
| Types | `lib/workspace/types.ts` |
| Migrations | `supabase/migrations/20260729180000_workspace_settings.sql` |
| | `supabase/migrations/20260729181000_workspace_settings_hardening.sql` |
| | `supabase/migrations/20260729192000_workspace_slug_aliases.sql` |

Related shell wiring:

- `app/(app)/w/[slug]/layout.tsx` — selects `logo_url`, passes `logoUrl` to chrome
- `components/app/types.ts` — `ShellWorkspace.logoUrl`
- `components/app/app-sidebar.tsx` — shows logo when set
- `lib/onboarding/actions.ts` — `create_workspace` gets `p_region` from `resolveWorkspaceRegionLabel()`

## DB columns on `workspaces`

| Column | Notes |
|--------|-------|
| `logo_url` | Public URL (+ cache bust query) |
| `fiscal_year_start_month` | 1–12, default 1 |
| `region` | Immutable after create (trigger `workspaces_preserve_region`) |
| `deletion_scheduled_at` | Null or scheduled timestamp |

Storage bucket: `workspace-logos` (public, 2MB, jpeg/png/webp/gif).  
Path: `{workspaceId}/logo.{ext}`  
RLS: owner/admin via `private.workspace_role(...)`.

Delete policy: owners can `DELETE` workspaces (`workspaces_delete_owner`).

## Slug aliases (former URLs)

When the workspace slug changes, the previous slug is stored in `workspace_slug_aliases` (DB trigger `workspaces_record_slug_alias`).

- Visiting `/w/<old-slug>/…` permanently redirects to `/w/<current-slug>/…` (path + query preserved)
- Alias lookup: RPC `current_workspace_slug_for_alias(p_slug)` from `app/(app)/w/[slug]/layout.tsx`
- Proxy sets `x-pathname` / `x-search` so the layout can rebuild the redirect target
- Former slugs stay reserved (cannot be claimed by another workspace)
- Renaming back to a former slug reclaims that alias for the same workspace

## Region (do not show “Supabase” to users)

- Detected from Postgres host env (`POSTGRES_URL` / pooler host), e.g. `aws-1-ap-south-1…` → **Asia Pacific**
- Matching uses AWS-style codes only: `\b(eu|us|ap|…)-[a-z]+-\d+\b`
- Stored on create; UI is read-only
- User copy: “Set when a workspace is created and cannot be changed.” (no Read more, no tooltip naming infra)

## Permissions

| Action | Who |
|--------|-----|
| Edit name / slug / fiscal / logo | owner, admin (and **not** while deletion scheduled) |
| Schedule / cancel deletion | owner only |

When `deletion_scheduled_at` is set:

- `canEdit` is false
- Banner in UI: editing locked until cancel
- Server rejects edits with a clear error

## Logo upload

Mirror profile avatar flow:

- Client: file input + dropdown (upload / remove), 2MB check
- Server: `uploadWorkspaceLogo` / `removeWorkspaceLogo`
- MIME fallback from file extension when browser sends empty/`octet-stream`
- If DB update fails after storage upload, remove the uploaded object

## Form save behavior

- Name / slug: save on blur or Enter
- Fiscal month: save on select change
- Slug typing: `sanitizeSlugInput` (only `[a-z0-9-]`)
- Slug commit: `slugify` + validation; empty → slugify(name)
- Use `apiSlugRef` for server calls so concurrent field saves don’t hit a stale/optimistic slug
- On field failure, roll back **only that field** (don’t wipe sibling in-flight changes)
- Don’t sync `initialWorkspace` over local state while any key is pending
- After a successful slug change, hard-navigate to `/w/<new-slug>/settings/workspace`

## Create workspace RPC

`create_workspace(p_name, p_slug, p_region default null)`:

- Name required, max 80
- Slug 2–48, `^[a-z0-9]+(?:-[a-z0-9]+)*$`
- Region defaults to `Asia Pacific` if null

## UI sections (match Linear)

1. Logo, Name, URL (`{host}/` prefix from `siteConfig`)
2. Time & region — fiscal month + region
3. Member onboarding — Enterprise placeholders (dimmed)
4. Danger zone — schedule / cancel deletion (confirm by typing exact workspace name)
