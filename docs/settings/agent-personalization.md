# Agent personalization

**Route:** `/w/[slug]/settings/agent-personalization`  
**Status:** Guidance + Skills E2E

## Files

| Layer | Path |
|-------|------|
| Page | `app/(app)/w/[slug]/settings/agent-personalization/page.tsx` |
| Form | `components/settings/agent-personalization-form.tsx` |
| New skill | `app/(app)/w/[slug]/settings/skill/new/page.tsx` |
| Edit skill | `app/(app)/w/[slug]/settings/skill/[skillId]/page.tsx` |
| | `components/settings/create-agent-skill-form.tsx` |
| Actions | `lib/agent-personalization/actions.ts` |
| Queries | `lib/agent-personalization/queries.ts` |
| Schema | `lib/agent-personalization/schema.ts` |
| Types | `lib/agent-personalization/types.ts` |
| Migrations | `supabase/migrations/20260729200000_agent_personalization.sql` |
| | `supabase/migrations/20260729201000_agent_skills.sql` |

Nav: Account → Agent personalization (`components/app/settings-sidebar.tsx`).  
Skill create/edit keeps that nav item active via `/settings/skill/*`.

## Sections (match Linear)

1. **Guidance** — personal instructions for Zyvia Agent; save on blur; “Last edited …” when set
2. **Skills** — list personal skills ordered by `updated_at` (relative “Updated …” on the right); click a skill to edit; `+` → `/settings/skill/new`

MCP connectors intentionally omitted for now.

## DB

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
