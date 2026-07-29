# Statuses settings

Issue statuses (team) and project statuses (workspace), Linear-style fixed categories.

## Shipped

| Surface | Path |
|---------|------|
| Workspace project statuses | `/w/[slug]/settings/statuses` |
| Team issue statuses | `/w/[slug]/settings/teams/[key]/statuses` |

- Domain: `lib/statuses/{types,schema,queries,actions}.ts`
- UI: `components/settings/statuses-settings-form.tsx`, `status-color-picker.tsx`, `status-category-icon.tsx`
- Schema: `supabase/migrations/20260730280000_statuses_settings.sql`

## Model

### Issue statuses (`workflow_states`)

Fixed categories (not editable): Backlog, Unstarted, Started, Completed, Canceled, Duplicate.

- Scoped to a team; seeded on team create (DB trigger + app restore defaults)
- At least one status per category (enforced in actions)
- Icon shape is fixed per category; only color is editable (debounced picker)
- DnD reorder within a category (`position`)
- Optional description; issue usage count shown when no description
- One default status per team (`is_default`); used when creating issues

### Project statuses (`project_statuses`)

Fixed categories: Backlog, Planned, In Progress (`started`), Completed, Canceled.

- Workspace-scoped; seeded on workspace create and backfilled for existing workspaces
- Same edit/reorder/default rules as issue statuses
- Usage counts deferred until projects exist

## Permissions

- Project statuses: workspace owner/admin write; members read; locked when workspace deletion is scheduled
- Issue statuses: team owner/admin or workspace owner/admin write; members read

## UI

- Category sections with `+` to add a status
- Row: drag handle (when 2+), category icon color picker, name · Default, description / usage, overflow (Edit / Set as default / Delete)
- Inline edit: name + description + Cancel / Save
- Delete requires a replacement when issues still use the status

## Deferred

- Applying/changing status from issue/project surfaces beyond GraphQL create default
- Project usage counts
- Moving a status between categories (categories stay fixed)

## Edge cases

1. Members can view; only managers edit — locked while workspace deletion is scheduled.
2. Categories are fixed; at least one status per category (UI hides Delete; server also rejects).
3. Default status cannot be deleted until another is set as default.
4. Delete with issue usage requires a replacement status (issues moved first).
5. Edit save no-ops when name/description/color are unchanged after normalize (no toast write).
6. Empty name blocked client-side; whitespace collapsed server-side.
7. Color picker debounces (~350ms) and flushes on close; unchanged colors skip writes.
8. Concurrent field saves use request ids; rollback only the failed status fields; ignore `initialSettings` refresh while pending.
9. Setting a new default clears the previous first; if the new write fails, the previous default is restored.
10. Reorder rejects stale/missing ids and no-ops when order is unchanged.
11. Add while editing discards the open draft (does not auto-save).
12. Default create names auto-suffix (`New status`, `New status 2`, …).
13. Sibling names unique per team (issue) / workspace (project), case-insensitive.
