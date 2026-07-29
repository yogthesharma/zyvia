# Rich editor playground (removable)

Temporary Plate + shadcn experiment. Nothing here is wired into product flows.

## Try it

Open `/rich-editor`.

## Remove later

1. Delete folders/files:
   - `app/rich-editor/`
   - `components/rich-editor/`
   - `components/editor/` (includes `media-upload-dialog.tsx`)
   - Plate-added UI under `components/ui/` (see list below)
   - `hooks/use-upload-file.ts`, `hooks/use-mounted.ts` (if unused elsewhere)
   - `lib/uploadthing.ts`, `lib/suggestion.ts`

2. Revert `components.json` `@plate` registry entry if unused.

3. Revert Plate CSS vars in `app/globals.css` (`--brand`, `--highlight`, `--color-brand`, `--color-highlight`) if unused.

4. Remove Plate-related deps from `package.json` (anything `@platejs/*`, `platejs`, `@uploadthing/*`, `uploadthing`, `@ariakit/react`, `@udecode/cn`, `react-player`, `react-lite-youtube-embed`, `react-tweet`, `use-file-picker`, `tailwind-scrollbar-hide`, and lodash if only used by Plate).

### Likely Plate UI files under `components/ui/`

`editor.tsx`, `editor-static.tsx`, `fixed-toolbar.tsx`, `toolbar.tsx`, `mark-toolbar-button.tsx`, `*-node.tsx` / `*-node-static.tsx` for blockquote/heading/paragraph/hr/code/kbd/highlight/mention/table/media/list, `media-*`, `table-*`, `list-toolbar-button.tsx`, `indent-toolbar-button.tsx`, `font-color-toolbar-button.tsx`, `inline-combobox.tsx`, `caption.tsx`, `resize-handle.tsx`, `block-selection.tsx`, `block-list.tsx`, `block-list-static.tsx`, `alert-dialog.tsx`, `checkbox.tsx` (only if unused elsewhere).

Keep any of those that other product code starts depending on.
