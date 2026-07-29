# Labels settings

Workspace and team label management for issues and projects.

## Shipped

| Surface | Path |
|---------|------|
| Workspace issue labels | `/w/[slug]/settings/labels` |
| Workspace project labels | `/w/[slug]/settings/project-labels` |
| Team issue labels | `/w/[slug]/settings/teams/[key]/labels` |

- Domain: `lib/labels/{types,schema,queries,actions}.ts`
- UI: `components/settings/labels-settings-form.tsx`, `label-color-picker.tsx`
- Schema: `supabase/migrations/20260729270000_labels_settings.sql`
- Workspace labels: owners/admins write; all members read; locked when workspace deletion is scheduled
- Team labels: team owner/admin or workspace owner/admin write
- Project labels are workspace-scoped only (`team_id` must be null)

## Model

- One `labels` table for both issue and project labels (`kind`)
- Groups are rows with `is_group = true`; child labels use `parent_id`
- Groups are mutually exclusive when applying (enforcement deferred until apply flows)
- Max 250 labels per group (DB trigger + action check)
- Archive via `archived_at` (keeps historical links); delete removes the row (cascade children + issue_labels)
- Reserved issue label names: assignee, cycle, effort, estimate, hours, priority, project, state, status

## UI

- Filter by name; scope: Workspace / Workspace and teams (issue only) / Archived
- Inline name + description edits; preset + custom hex color picker (debounced commit)
- New group / New label
- Overflow: archive/restore, delete (confirm), add label to group
- No drag-and-drop reorder (Linear does not support it for labels)

## Deferred

- Applying labels to issues/projects (picker, shortcut `L`, mutually exclusive apply)
- Merge, convert to group, move workspace ↔ team
- Bulk multi-select actions
- Project usage counts / last applied (no projects table yet)
- Updating `last_applied_at` on apply
- Filtering, views, insights by label
- Create-from-add-label syntax (`Type/Bug`)
