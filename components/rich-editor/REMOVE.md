# Rich editor

## Product path (keep)

- `components/rich-editor/rich-text-editor.tsx` — editable Plate wrapper
- `components/rich-editor/rich-text-viewer.tsx` — static read-only renderer
- `components/rich-editor/index.tsx` — lazy export for code-splitting
- `components/rich-editor/editor-context.tsx` — mentionables + workspace upload context
- `lib/rich-editor/*` — types, schema, plain-text, upload action
- `lib/workspace/mentionables.ts`
- `lib/issues/actions.ts` — create/update via GraphQL
- Issue UI: `app/(app)/w/[slug]/issues/**`, `components/issues/*`

First product surface: **issue description** (`issues.description_doc` jsonb + plain `description`).

Product overview + **out-of-scope / deferred** items: [docs/rich-editor/README.md](../../docs/rich-editor/README.md).

## Playground (dev only)

`/rich-editor` is gated with `notFound()` in production.

- `app/rich-editor/`
- `components/rich-editor/playground.tsx`
- `components/rich-editor/demo-value.ts`

## Optional full removal of Plate

If abandoning rich text entirely:

1. Delete product + playground folders above, plus `components/editor/` and Plate UI under `components/ui/`.
2. Revert `components.json` `@plate` registry entry.
3. Revert Plate CSS vars in `app/globals.css`.
4. Remove Plate-related deps from `package.json`.
5. Drop `issues.description_doc` and `editor-media` bucket via a new migration.
