# SLAs

**Route:** `/w/[slug]/settings/slas`  
**Status:** Settings E2E (enable, work week, automation rules). Issue evaluation **not shipped**.

## Files

| Layer | Path |
|-------|------|
| Page | `app/(app)/w/[slug]/settings/slas/page.tsx` |
| Form | `components/settings/slas-settings-form.tsx` |
| Actions | `lib/sla/actions.ts` |
| Queries | `lib/sla/queries.ts` |
| Schema | `lib/sla/schema.ts` |
| Types | `lib/sla/types.ts` |
| Migration | `supabase/migrations/20260729210000_workspace_slas.sql` |

Nav: Issues → SLAs (`settings-sidebar`).

## Shipped (settings)

1. **Disabled state** — banner + Enable SLAs (owners/admins); Add rule disabled  
2. **Enable** — sets `workspace_sla_settings.enabled` and seeds default rules if none exist:
   - Priority Urgent → add 24h SLA  
   - Priority High → add 1 week SLA  
   - Priority Medium / Low / No priority → remove SLA  
3. **Work week** — Mon–Fri or Sun–Thu (for future business-day math)  
4. Automation rules — create / edit / delete / **drag-and-drop reorder** (`@dnd-kit`); first matching rule wins  
5. **v1 filters** — Priority only (Team/Status/Labels/etc. later)  
6. **Durations** — 12h, 24h, 48h, 1w, 2w, 4w, custom (hour / day / business day / week)

Drag UX: grip handle, floating DragOverlay for the picked row, dashed placeholder in the list, smooth sortable animation, keyboard reorder via dnd-kit sensors.

Members can view; only owners/admins mutate.

## Intentionally deferred (no issue create/update yet)

Documented so a later thread can implement without re-reading Linear docs:

| Capability | Effect | Notes |
|------------|--------|-------|
| Evaluate on issue create/update | Apply/remove SLA from ordered rules | Do **not** backfill existing issues when rules change |
| Priority change trigger | Changing priority re-evaluates rules | Existing prioritized issues without SLA stay until priority changes |
| Issue SLA fields | Deadline + status on issue | Mutually exclusive with due date (SLA clears due date) |
| SLA statuses | Low / Medium / High risk, Breached, Achieved, Failed | Derived from deadline vs now / completed_at |
| Fire icon badge | Gray → yellow → orange → red | Issue list + detail |
| Manual Set SLA | Issue ⋯ menu | Clears due date; may be removed by a remove-rule on next update |
| Notifications | 24h-to-breach + breach | Inbox + optional team Slack later |
| View filters / Insights | Filter/group by SLA status | After issues views exist |

## DB

`workspace_sla_settings` — `enabled`, `work_week`  
`workspace_sla_rules` — `position`, `action` (`add`|`remove`), duration fields, `filters` jsonb `{ priority: [...] }`

RLS: members select; owner/admin write.
