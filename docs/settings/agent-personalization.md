# Agent personalization & team skills

## Personal (Account)

**Route:** `/w/[slug]/settings/agent-personalization`  
**Status:** Guidance + Skills E2E

| Layer | Path |
|-------|------|
| Page | `app/(app)/w/[slug]/settings/agent-personalization/page.tsx` |
| Form | `components/settings/agent-personalization-form.tsx` |
| New skill | `app/(app)/w/[slug]/settings/skill/new/page.tsx` |
| Edit skill | `app/(app)/w/[slug]/settings/skill/[skillId]/page.tsx` |
| Form UI | `components/settings/create-agent-skill-form.tsx` |
| Actions | `lib/agent-personalization/actions.ts` |
| Queries | `lib/agent-personalization/queries.ts` |
| Schema | `lib/agent-personalization/schema.ts` |
| Types | `lib/agent-personalization/types.ts` |
| Migrations | `supabase/migrations/20260729200000_agent_personalization.sql` |
| | `supabase/migrations/20260729201000_agent_skills.sql` |

Nav: Account → Agent personalization (`components/app/settings-sidebar.tsx`).  
Skill create/edit keeps that nav item active via `/settings/skill/*`.

### Sections (match Linear)

1. **Guidance** — personal instructions for Zyvia Agent; save on blur; “Last edited …” when set
2. **Skills** — list personal skills ordered by `updated_at` (relative “Updated …” on the right); click a skill to edit; `+` → `/settings/skill/new`

MCP connectors intentionally omitted for now.

### DB

`user_agent_personalization` (1:1 with `profiles`):

| Column | Notes |
|--------|-------|
| `guidance` | text, max 10_000 chars |
| `guidance_updated_at` | set on guidance save |

`user_agent_skills`:

| Column | Notes |
|--------|-------|
| `name` | 1–120 chars |
| `instructions` | max 20_000 chars |

RLS: own rows only.

---

## Team agent skills

**Route:** `/w/[slug]/settings/teams/[key]/agent-skills`  
**Status:** List + create/edit E2E (delete deferred)

Shared reusable instructions for the team (Linear-style empty row + `+`, name + instructions form).

| Layer | Path |
|-------|------|
| List | `app/(app)/w/[slug]/settings/teams/[key]/agent-skills/page.tsx` |
| | `components/settings/team-agent-skills-settings.tsx` |
| New | `.../agent-skills/new/page.tsx` |
| Edit | `.../agent-skills/[skillId]/page.tsx` |
| Form | Same `AgentSkillForm` with `teamKey` |
| Migration | `supabase/migrations/20260729280000_team_agent_skills.sql` |

Hub row under Workflow shows skill count (`None` / `N skills`).

### Permissions

- **Read:** any workspace member
- **Create/update:** team members, or workspace owner/admin
- Locked when workspace deletion is scheduled (`canEdit` false)

### DB

`team_agent_skills`:

| Column | Notes |
|--------|-------|
| `workspace_id` / `team_id` | cascade; guard keeps them aligned |
| `name` | 1–120 chars |
| `instructions` | max 20_000 chars |
| `created_by` | profile, set null on delete |

### Deferred

- Delete skill UI
- Surfacing team skills inside the agent chat / mention UX
