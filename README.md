# Zyvia

Linear-like project management, built with Next.js.

## Stack

- **Next.js** (App Router) + TypeScript on **Vercel**
- **Supabase** (via Vercel Marketplace) — Postgres + Auth + RLS
- **GraphQL** — Pothos + GraphQL Yoga at `/api/graphql`
- **Tailwind CSS** + **shadcn/ui**
- **Inter** as the base font

## Iteration 1

- Public: `/`, `/login`, `/signup`, `/privacy`, `/terms`
- Auth: email + password (Supabase)
- Onboarding: one question per page (profile → workspace → team → theme → invite)
- App: Linear-ish shell at `/w/[slug]/issues` (issues loaded via GraphQL)

Schema lives in `supabase/migrations/`.

## GraphQL

- Endpoint: [`/api/graphql`](http://localhost:3000/api/graphql) (GraphiQL in development)
- Server execute helper: `executeGraphQL()` in `lib/graphql/execute.ts`
- Queries: `viewer`, `workspace(slug)` → `issues` / `teams`
- Mutations: `issueCreate`

## Getting started

```bash
pnpm install
pnpm exec vercel link          # once — link to the Vercel project
pnpm exec vercel env pull .env.local
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Copy `.env.example` if you need a blank template. Never commit `.env.local`.

## Supabase clients

| Import | Use |
|--------|-----|
| `@/lib/supabase/client` | Client Components (browser) |
| `@/lib/supabase/server` | Server Components / Actions / Route Handlers |
| `@/lib/supabase/admin` | Service role (bypasses RLS) — server only |
| `proxy.ts` | Refreshes the auth session on each request |

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
