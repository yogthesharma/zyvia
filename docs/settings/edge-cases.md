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
11. **Team skills** — any workspace member can view; create/update for team members or workspace owner/admin; locked when workspace deletion is scheduled; deleted teams 404; retired teams remain editable (same as other team settings).
12. **Team skill scope** — create/update always binds to the team resolved from the URL key (never a client-supplied team id); foreign skill ids for that team → not found.
13. **Team skill redirects** — validated workspace slug + 2–4 letter team key only.
14. **Team hub count** — `team_agent_skills(count)` on team detail; empty → “None”.
15. Duplicate skill names allowed (same as personal skills). Delete UI deferred.

## SLAs

1. Members can view; only owners/admins enable, edit work week, or mutate rules — and not while workspace deletion is scheduled.
2. Enable is idempotent; default rules seed only when the workspace has zero rules. Seed failure rolls enable back off.
3. Disable keeps existing rules (re-enable restores the same list).
4. Add rule is disabled until SLAs are enabled.
5. First matching rule wins — drag to reorder (`@dnd-kit` overlay + placeholder + vertical restriction); positions persisted via `reorderSlaRules`.
6. Reorder rejects duplicate/missing/stale ids; create uses max(position)+1 and maps unique collisions.
7. Remove-action rules cannot carry a duration; add-action custom durations require amount + unit (client parse + DB check).
8. Invalid rule ids → “Rule not found.”; update no-ops when unchanged.
9. Pending mutations ignore `initialSettings` refresh clobber.
10. Issue create/update evaluation, badges, notifications, and filters are **not** shipped yet (see `slas.md`).

## Teams

1. **Creator membership** — creating a team always inserts the creator as team `owner`; onboarding does the same.
2. **Membership insert failure** — roll back by deleting the team; DELETE RLS must allow workspace members (see hardening migration). If rollback fails, return a clear incomplete-team error.
3. **Default icon** — empty/null icon becomes `users`; column is NOT NULL with default.
4. **No fake icon color** — team icons use muted foreground until a color picker ships.
5. **List query failure** — teams settings page soft-fails to `notFound()` instead of 500ing the shell.
6. **Retired / deleted filters** — driven by `retired_at` / `deleted_at`; list includes deleted when `includeDeleted`; shell sidebars exclude deleted.
7. **Leave team** — blocked when the user is the sole team owner; blocked for deleted teams.
8. **Soft delete** — requires exact team name confirm (trim/collapse spaces); sets `deleted_at` (and `retired_at` if unset).
9. **Restore deleted** — clears `deleted_at` and `retired_at` back to active; hub shows restore-only UI for deleted teams.
10. **Retire / restore retired** — idempotent no-ops when already in that state.
11. **Delete dialog** — stays open on failed confirm/action; closes only after success.
12. **Reserved key `NEW`** — cannot collide with `/settings/teams/new`.
13. **Parent team** — same-workspace enforced by trigger; self-parent blocked by check.
14. **Empty danger zone** — section omitted when the viewer has no leave/manage actions.
15. **Settings back link** — `SettingsSubpage` sticky top-left in the scrolling main pane.
16. **General settings** — name/icon/key/description/timezone/estimation + email-intake and detailed-history flags; managers only (team owner/admin or workspace owner/admin); deleted teams 404; members can view read-only.
17. **Identifier rename** — sanitize while typing (A–Z only, max 4) like workspace slug; unique per workspace; reserved `NEW` blocked; invalid/empty restores previous + toast; after save hard-navigate (`location.assign`) to `/settings/teams/{key}/general`. Issue identifiers are derived as `{key}-{number}`.
18. **Description** — optional, trimmed, max 500 chars; rendered full-width outside a settings card; whitespace-only saves as empty.
19. **Email intake / detailed history** — persisted toggles only; delivery and history writers are not shipped yet.
20. **Concurrent field saves** — per-field pending + request ids; rollback only the failed field; successful responses preserve other in-flight optimistic fields; ignore `initialTeam` refresh while any field is pending.
21. **No-op patches** — server skips unchanged values (no empty updates); update also requires `deleted_at is null`.
22. **Key rename navigation** — hard navigate to the new general URL; do not `refresh()` the old key URL.
23. **General chrome** — page title is **General**; sticky top-left control is team icon + name linking to the team hub (no Back label).
24. **Estimation options** — when issue estimation ≠ “Not in use”, show allow-zero / extended-scale / count-unestimated toggles; values persist when estimation is turned off.

## Members

1. **Workspace list** — any member can view; invite/revoke/export only for owner/admin; members soft-fail to `notFound()` on query errors.
2. **Invites** — emails lowercased + validated; skip already-members and pending duplicates; max 50 per batch; cannot invite as owner; invalid role rejected (no silent default); email delivery deferred (pending rows only); partial batches report invited + skipped counts.
3. **Revoke** — only pending invites; idempotent miss → “Invite not found.”
4. **Team add** — candidates are workspace members not already on the team; team managers or workspace admins only; insert role defaults to member (not owner); invalid role rejected.
5. **Sole team owner** — cannot remove or demote the last owner.
6. **Role display vs manage** — workspace owner/admin still show as “Workspace owner/admin”, but managers can open the role menu (change team role / remove). Non-managers can open their own row menu to leave.
7. **Assign owner** — only team owners or workspace owner/admin can promote to team owner; team admins cannot.
8. **Role no-op** — unchanged role short-circuits (no write / no toast).
9. **Last seen** — approximated from max session activity; “Online” within 5 minutes; empty → “—”.
10. **Deletion scheduled** — workspace invites blocked while deletion is scheduled.
11. **Directory RPC** — emails/last-seen only for callers who are workspace members (`workspace_member_directory`).
12. **Pending section** — hidden on All when there are zero invites; always available via Pending invites filter.
13. **Deferred work** — email delivery, accept flow, Applications, workspace role/remove UI, etc. are listed in `members.md` (do not treat as missing bugs).

## Documents

1. Members can view templates; only owners/admins create/edit/delete — and not while workspace deletion is scheduled.
2. Workspace Documents settings only lists/creates templates with `team_id IS NULL`.
3. Create/edit requires a non-empty name; body may be empty; Create disabled until name is set.
4. Name ≤ 120; icon Lucide kebab-case ≤ 64; body plain text ≤ 100_000 (client + server).
5. Edit with no changes does not bump `updated_at`; client navigates back without a write.
6. Invalid / foreign template ids → `notFound()` (UUID check before query).
7. Redirects only use validated workspace slugs.
8. Empty body stores `body_doc = null` and `body_text = ''`.
9. Team templates and the documents product surface are **not** shipped yet (see `documents.md`).

## Labels

1. Members can view; workspace owners/admins manage workspace + project labels; team managers (or workspace admins) manage team labels — locked when workspace deletion is scheduled.
2. Project labels cannot have `team_id` (DB check + action guard).
3. Groups cannot nest; parent must be a group in the same workspace/kind/team scope.
4. Max 250 labels per group (trigger + action).
5. Sibling names unique (case-insensitive, including archived).
6. Reserved issue label names blocked on create/rename (not groups).
7. Archive cascades to children in a group; unarchive blocked for children while parent is archived.
8. Delete is hard-delete (cascades children + `issue_labels`); confirm dialog required.
9. Labels are listed by `position` then name; there is **no** drag-and-drop reorder UI (Linear does not support label DnD).
10. Inline edits race-safe: optimistic patch + rollback on error; ignore `initialSettings` refresh while pending; concurrent blur while pending toasts and restores the field.
11. Default create names auto-suffix (`New label`, `New label 2`, …) to avoid unique collisions; custom names still error on conflict.
12. Unarchive group updates the group row first, then children (parent guard rejects active children under archived groups).
13. Name filter keeps ancestor groups so nested matches stay visible; archived orphans (parent still active) are promoted to roots so they don’t disappear.
14. Color picker: presets commit immediately; custom HEX/slider debounces (~350ms) and flushes on popover close; emit is deduped against the last confirmed `value` (no stale committed color after a skipped/failed save).
15. Rested row chrome (description placeholder, `…` menu) only appears on hover / focus / open menu; input fill forced off with `!` against global control tokens.
16. Apply-to-issue/project, merge, move, bulk select, and `last_applied_at` writers are **not** shipped yet (see `labels.md`).

## Statuses

1. Members can view; workspace owners/admins manage project statuses; team managers (or workspace admins) manage issue statuses — locked when workspace deletion is scheduled.
2. Categories are fixed; each category always keeps ≥1 status (UI hides Delete; server also rejects).
3. Default status cannot be deleted until another is set; failed default swap restores the previous default.
4. Delete with issue usage requires a replacement (issues reassigned first).
5. Edit no-ops when unchanged after normalize; empty name blocked; descriptions optional.
6. Color picker: presets immediate; custom HEX/slider debounced (~350ms), flush on close.
7. Concurrent saves race-safe (request ids); rollback only the failed status; ignore `initialSettings` while pending.
8. DnD reorder within a category only; stale id sets rejected; unchanged order no-ops.
9. Add while editing discards the open draft; new names auto-suffix to avoid unique collisions.
10. Issue/project apply surfaces beyond settings are **not** shipped yet (see `statuses.md`).

## Team workflows

1. Members can view; team managers (or workspace admins) edit — locked when workspace deletion is scheduled.
2. Settings row is created lazily on first save; reads return defaults when missing.
3. Status picks must belong to the team; deleted/missing statuses sanitize to “No action”.
4. Branch rules: unique branch names (case-insensitive), max 50; empty name rejected.
5. Per-field optimistic saves with request ids; ignore `initialSettings` while pending.
6. Auto-close stale extras (period + status) only shown when the toggle is on.
7. Git/webhook runners, stale scanners, archive jobs, and board reordering are **not** executed yet (see `workflows.md`).
8. Enabling stale auto-close without a status auto-selects Canceled (server + client); fails if no statuses exist.
9. Status pickers follow workflow category/position order (not A–Z).
10. Branch rule field edits merge server-side by rule id; UI serializes edits per rule while pending.
11. Branch add is blocked at 50 rules; Enter in the add dialog submits.

## General

1. Prefer soft failures + toasts over uncaught client exceptions.
2. Settings top padding is `pt-12` on `SettingsPage` (intentional spacing).
3. Settings shell: sidebar fixed, **main pane** scrolls (`settings-shell.tsx`).
4. Settings subpage back links use `SettingsSubpage` / `SettingsBackLink` — sticky `top-4 left-4` in the scrolling main pane (not `absolute` that scrolls away).
5. **Surface chrome** — owned in `app/globals.css` via `--surface` / `--control*` tokens and unlayered `[data-slot]` rules (not per-component class soup). Settings/list shells use `data-slot="surface"`; fields use `data-slot="input"|textarea|select-trigger|control`. Sidebars keep `border-r` for pane separation; app shell header keeps `border-b` so scrolled content doesn’t collide with chrome.
6. **Sidebar width** — app and settings sidebars both use **16rem** (`Sidebar` `SIDEBAR_WIDTH` / settings `w-64`). Don’t regress to `w-60`.
7. **Borderless fields** — soft fills come from global `--control` tokens; focus uses ring + `--background`. Don’t re-add `bg-muted/50` / `border-input` fills on individual UI files (theme re-applies will fight them).
8. **Floating layers** — dialogs/menus/popovers keep soft ring + shadow so they don’t dissolve into the page.
