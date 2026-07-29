# Zyvia

Linear-like project management, built with Next.js.

## Stack

- **Next.js** (App Router) + TypeScript
- **Tailwind CSS** + **shadcn/ui**
- **Inter** as the base font

## Getting started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start the development server |
| `pnpm build` | Production build |
| `pnpm start` | Start the production server |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Type-check with TypeScript |
| `pnpm format` | Format with Prettier |

## UI components

Add shadcn components with:

```bash
pnpm dlx shadcn@latest add button
```

Import from `@/components/ui`:

```tsx
import { Button } from "@/components/ui/button"
```
