# Edge cases already handled (don’t regress)

## Workspace settings

1. **Concurrent field saves** — rolling back name must not restore an old slug that already saved. Rollback only the failed key; API calls use `apiSlugRef`.
2. **Refresh clobber** — ignore `initialWorkspace` sync while any pending key is set.
3. **Empty name** — client blocks before server; restore previous value + toast.
4. **Junk slug** — sanitize while typing; `slugify` on commit; invalid → restore + toast.
5. **Slug taken** — DB unique → `23505` → “That workspace URL is already taken.”
6. **Deletion scheduled** — edits locked in query (`canEdit`), UI banner, and server `requireWorkspaceEditor`.
7. **Schedule/cancel idempotent** — already scheduled / not scheduled returns current workspace.
8. **Delete confirm** — exact normalized name match (trim/collapse spaces); empty confirm rejected.
9. **Logo MIME missing** — infer from filename extension; reject unknown types.
10. **Logo DB fail after upload** — remove storage object.
11. **Region false positives** — match `eu-west-1`-style codes only, not random `eu_` in connection strings.
12. **No infra in UI** — no Supabase mentions; no “Read more” on region.
13. **Members** — inputs disabled; delete disabled unless `canDelete`.
14. **Create RPC** — slug length 2–48 and name max 80 enforced in SQL.
15. **Slug rename aliases** — old slugs are saved and redirect to the current URL; former slugs stay reserved for other workspaces.
16. **Slug rename client nav** — after a successful slug save, hard-navigate (`location.assign`) to the new settings URL; don’t `router.refresh()` on the old slug (now an alias).

## Connected accounts

1. Connect always toasts “Coming soon” (no half-wired OAuth).
2. Don’t show a fake Connected GitHub state without a real account link.

## Agent personalization

1. Guidance saves on blur; empty guidance is allowed; max 10_000 chars (client + server).
2. Guidance no-op when unchanged after normalize; pending blur ignores `initialSettings` clobber.
3. Concurrent guidance saves use request ids; only the latest response applies / rolls back.
4. Skill create/edit requires a non-empty name; instructions may be empty; primary action disabled until name is set.
5. Skill name ≤ 120 / instructions ≤ 20_000 (client maxLength + server parse).
6. Edit with no changes does not bump `updated_at`; client navigates back without a write.
7. Invalid / foreign skill ids → `notFound()` (UUID check before query; soft-fail page errors).
8. Skill redirects only use validated workspace slugs (no open redirect via `workspaceSlug`).
9. Skill rows show relative “Updated …” on the right; list ordered by `updated_at` desc.
10. MCP connectors section is omitted for now.

## Teams

1. **Creator membership** — creating a team always inserts the creator as team `owner`; onboarding does the same.
2. **Membership insert failure** — roll back by deleting the team; DELETE RLS must allow workspace members (see hardening migration). If rollback fails, return a clear incomplete-team error.
3. **Default icon** — empty/null icon becomes `users`; column is NOT NULL with default.
4. **No fake icon color** — team icons use muted foreground until a color picker ships.
5. **List query failure** — teams settings page soft-fails to `notFound()` instead of 500ing the shell.
6. **Retired / deleted filters** — UI only; empty until those flows exist.

## General

1. Prefer soft failures + toasts over uncaught client exceptions.
2. Settings top padding is `pt-12` on `SettingsPage` (intentional spacing).
3. Settings shell: sidebar fixed, **main pane** scrolls (`settings-shell.tsx`).
