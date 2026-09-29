# Vaughan Code University

React 19 + Vite 6 + TypeScript + Tailwind 4 single-page app, deployed to Vercel from GitHub.

## Develop

```bash
bun install
bun run dev      # http://localhost:3000
bun run lint     # TypeScript check (tsc --noEmit)
bun run build    # production build to dist/
```

## Branches

- `main` is production. Changes land only through pull requests with passing CI.
- `feature/ai-course-studio` is the Instructor Studio / AI Course Factory work.

## Routing

URL-driven via `react-router` (see `src/lib/routes.ts`). Legacy `setActiveTab` /
`setSelectedCourseId` / `setSelectedLessonId` context calls still work; they navigate.

| Path | View |
|---|---|
| `/community`, `/calendar`, `/members`, `/leaderboards`, `/profile`, `/admin` | University tabs |
| `/classroom`, `/classroom/:courseId`, `/classroom/:courseId/lesson/:lessonId` | Classroom |
| `/instructor/*` | Instructor Studio (faculty only) |

## Environment

See `.env.example`. Only `VITE_`-prefixed variables reach the browser. Secrets
(Supabase service role, DeepSeek) are server-only and used from `/api` functions.

## Current state (important)

Data is still local demo data in browser `localStorage`, sign-in is not real, and
payments are simulated. Supabase (Postgres, Auth, Storage, RLS) replaces these
incrementally. UI permission helpers in `src/lib/permissions.ts` are presentation
only; the security boundary will live in the database and server functions.
