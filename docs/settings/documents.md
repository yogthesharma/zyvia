# Documents settings

Workspace **Features → Documents** manages workspace-wide document templates.

## Shipped

| Surface | Path |
|---------|------|
| Templates list | `/w/[slug]/settings/documents` |
| Create | `/w/[slug]/settings/documents/new` |
| Edit / delete | `/w/[slug]/settings/documents/[templateId]` |

- Domain: `lib/documents/{types,schema,queries,actions}.ts`
- UI: `components/settings/documents-settings.tsx`, `document-template-form.tsx`
- Schema: `document_templates` (`supabase/migrations/20260729260000_document_templates.sql`)
- Icon via `IconPicker` (Lucide name string, default `file-text`)
- Body via Plate `RichTextEditor` → `body_doc` jsonb + derived `body_text`
- Owner/admin write; all members can read; edits locked when workspace deletion is scheduled

## Schema notes

- `team_id` nullable — `NULL` = workspace template (this UI). Team-scoped templates use the same table later.
- Trigger rejects a `team_id` whose team is in a different workspace.
- Empty body stores `body_doc = null` and `body_text = ''`.

## Deferred

- Actual **documents** product (list/detail/create from template)
- Team document templates UI under team settings
- GraphQL surface (settings use server actions + Supabase for now)
