# Members settings

**Routes:**
- Workspace: `/w/[slug]/settings/members`
- Team: `/w/[slug]/settings/teams/[key]/members`

**Status:** Settings E2E for list + invite (pending rows) + team add/role/remove. Email delivery, accept flow, and Applications **not shipped**.

## Files

| Layer | Path |
|-------|------|
| Workspace page | `app/(app)/w/[slug]/settings/members/page.tsx` |
| Team page | `app/(app)/w/[slug]/settings/teams/[key]/members/page.tsx` |
| Workspace UI | `components/settings/members-settings-list.tsx` |
| Team UI | `components/settings/team-members-settings.tsx` |
| Actions | `lib/members/actions.ts` |
| Queries | `lib/members/queries.ts` |
| Schema | `lib/members/schema.ts` |
| Types | `lib/members/types.ts` |
| Migration | `supabase/migrations/20260729250000_members_directory.sql` |

Nav: Administration → Members; team hub → Members.

## Shipped

| Surface | Capabilities |
|---------|--------------|
| Workspace Members | List (name, email, role/status, teams, joined, last seen), search + All/Active/Pending filter, pending invites, invite dialog, revoke, export CSV |
| Team Members | List (name, email, role), search + role filter, add from workspace members, change role, remove / leave |

## Permissions

- Any workspace member can view workspace Members.
- Invite / revoke: workspace owner or admin.
- Team Members manage (add / role / remove): team owner/admin **or** workspace owner/admin.
- Assign team owner: team owner **or** workspace owner/admin (not team admin alone).
- Cannot remove / demote the sole team owner.
- Non-managers can leave from their own row menu.

## Intentionally deferred

Documented so a later thread can implement without rediscovering Linear gaps:

| Capability | Effect | Notes |
|------------|--------|-------|
| Invite email delivery | Send invite emails when creating pending invites | Today rows are inserted as `pending` only; copy already says delivery comes later (same as onboarding) |
| Accept-invite flow | Recipient joins workspace from invite link / signed-in accept | Need token or email match on signup/login; mark invite `accepted`; insert `workspace_members` |
| Re-invite / resend | Resend email for an existing pending invite | Depends on delivery; revoke + recreate already works for a new pending row |
| Applications / join requests | Linear “Application” section on Members | Needs a join-request model (not today’s `settings/applications` stub); approve → membership |
| Workspace role change UI | Change member ↔ admin (and owner transfer) on workspace Members | DB + RLS already allow owner/admin writes on `workspace_members`; guard sole owner; no owner via invite |
| Remove member from workspace | Admin removes someone from the workspace | Leave-self exists on Profile (`leaveWorkspace`); need admin remove + sole-owner guard + team membership cleanup policy |
| Transfer workspace ownership | Promote another member to owner / demote self | Separate from team owner assign; document sole-owner rules |
| Guest / restricted roles | Linear guest-style access | Schema today is only `owner` \| `admin` \| `member` |
| Team invite by email | Invite someone not yet in the workspace straight onto a team | Today: invite to workspace first, then Add a member; optional `team_id` on invites later |
| Perfect Last seen | Product-grade presence | Current: `max(user_sessions.last_seen_at)` via directory RPC; “Online” if &lt; 5 minutes; no multi-device policy / idle timeout product yet |
| Member profile deep-link | Click row → person settings / profile | Table rows are not navigable yet |
| Bulk actions | Multi-select remove / role change / export selection | Export CSV is full active list only |
| SCIM / directory sync | IdP-driven membership | Out of scope until enterprise identity work |

## DB touchpoints

- `workspace_members` — `owner` \| `admin` \| `member`
- `team_members` — `owner` \| `admin` \| `member`
- `invites` — workspace-level; `pending` \| `accepted` \| `revoked`; role `admin` \| `member` only
- `public.workspace_member_directory(workspace_id)` — emails + last seen for callers who are members
- `private.team_role(team_id)` — used by team membership RLS so team owner/admin can manage

## Related

- Edge cases: `docs/settings/edge-cases.md` → Members
- Leave workspace: Profile settings (`lib/profile/actions.ts`)
- Onboarding invites: `lib/onboarding/actions.ts` `saveInvites` (same pending-insert pattern)
