# Members settings

Workspace Members + per-team Members pages.

## Shipped

| Surface | Route | Capabilities |
|---------|-------|--------------|
| Workspace Members | `/w/[slug]/settings/members` | List (name, email, role, teams, joined, last seen), search/filter, pending invites, invite, revoke, export CSV |
| Team Members | `/w/[slug]/settings/teams/[key]/members` | List (name, email, role), search/filter, add from workspace members, change role, remove |

## Domain

- `lib/members/{types,schema,queries,actions}.ts`
- Migration `20260729250000_members_directory.sql` — `workspace_member_directory` RPC + team-manager RLS

## Permissions

- Any workspace member can view workspace Members.
- Invite / revoke: workspace owner or admin.
- Team Members manage (add / role / remove): team owner/admin **or** workspace owner/admin.
- Cannot remove / demote the sole team owner.

## Deferred

- Invite email delivery (rows are saved as pending)
- Accept-invite onboarding flow from settings invites
- Join-request / Applications section
- Workspace role change UI (owner/admin/member edits)
- Remove member from workspace (leave remains on Profile)
- Perfect “Last seen” product semantics (uses max `user_sessions.last_seen_at`)
