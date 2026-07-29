# Team workflows & automations

Team settings for git/PR status moves, auto-close, auto-archive, and status placement.

## Shipped

| Surface | Path |
|---------|------|
| Team workflows | `/w/[slug]/settings/teams/[key]/workflows` |

- Domain: `lib/workflows/{types,schema,queries,actions}.ts`
- UI: `components/settings/team-workflows-settings-form.tsx`
- Schema: `supabase/migrations/20260730290000_team_workflow_settings.sql`
- Managers (team owner/admin or workspace owner/admin) can edit; members can view; locked when workspace deletion is scheduled

## Settings model (`team_workflow_settings`)

- PR/commit automations: draft open, PR/commit open, review activity, ready for merge, merge → optional issue status (`null` = No action)
- Branch-specific rules: up to 50 named target branches with the same five status overrides
- Auto-close: parent when last sub-issue closes; all sub-issues when parent closes; stale issues after preset + target status
- Auto-archive closed items after preset (`never` … `1_year`)
- When progressing status, place issues: `none` / `first` / `last`

Lazy row create on first save (defaults returned when no row exists).
Status pickers are ordered by issue status category then position.
Enabling stale auto-close without a target status defaults to Canceled.

## Deferred (not executed yet)

These are stored for later runners — **do not treat as missing UI bugs**:

1. GitHub/Git webhook listeners that apply PR/commit → status moves
2. Branch-rule matching against real PR target branches
3. Parent/sub-issue auto-close on issue close
4. Stale-issue scanner / cron
5. Auto-archive jobs for issues, cycles, and projects
6. Manual board ordering when status progresses (`first` / `last`)
7. Copying workflow settings when creating a team from another team
