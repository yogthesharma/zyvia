# Rich editor

Plate-based rich text used for **issue descriptions** and **document templates**.

## Shipped (v1)

- Product `RichTextEditor` / `RichTextViewer` (`components/rich-editor/`)
- Persist Plate JSON in `issues.description_doc`; sync plain `issues.description`
- Document templates: `document_templates.body_doc` + derived `body_text` (see `docs/settings/documents.md`)
- Workspace-scoped uploads via Supabase `editor-media`
- `@` mentions from workspace members
- Issue create / detail / list entry points under `/w/[slug]/issues`
- `/rich-editor` playground (dev only; 404 in production)

See also [REMOVE.md](../../components/rich-editor/REMOVE.md) for keep vs tear-down paths.

## Out of scope (deferred)

These were explicitly **not** part of the first ship. Track them separately before expanding rich text beyond issue descriptions.

| Item | Why deferred | What it likely needs |
|------|----------------|----------------------|
| **Live collaboration** | Single-editor save is enough for issue descriptions; realtime multiplayer is a large dependency (presence, OT/CRDT, conflict UX). | Provider (e.g. Yjs + PartyKit/Liveblocks), awareness UI, reconnect/offline policy |
| **Issue comments** | No comments table or UI yet; in-editor Plate “discussion” kits are demo-only. | `comments` (or similar) schema, ACL, notifications, mount editor/viewer on a thread surface |
| **Documents product** | Templates settings ship; actual documents (create from template, list/detail) are not built yet. | `documents` table, permissions, list/detail routes, apply template → new doc |
| **Mention notifications** | Prefs already have a `mentions` flag, but nothing parses saved docs or emits events on `@user`. | Extract mention IDs on save, enqueue/email/in-app notify, deep link to issue |
| **Markdown / HTML export** | Product only stores Plate JSON + plain-text snippet; no copy-as-markdown or email HTML path. | Serializer (md/html), paste/import rules, support/email consumers if required |
| **UploadThing in production** | Product uploads use Supabase Storage; UploadThing remains playground fallback only (no prod route/env). | Only if leaving Supabase: API route, auth middleware, `UPLOADTHING_*` env, cut over `useUploadFile` |

### Related non-goals for v1

- Tightening issue edit ACL beyond “any workspace member” (matches current issues RLS)
- Mobile-specific toolbar redesign (basic responsive pass only as needed)
- Soft limits / pagination for huge docs
- Replacing agent guidance / skill instruction textareas with Plate (wrong fit for LLM prompts)

## When picking one of these up

1. Prefer extending the existing product API (`RichTextEditor` props, `lib/rich-editor/*`, Supabase media) over rewiring the playground.
2. Keep plain `description` (or equivalent) in sync if search/snippets still depend on it.
3. Do not re-enable UploadThing for product paths unless deliberately migrating off Supabase media.
