# Repository Guidelines

## Project Structure & Module Organization

This Next.js 16 frontend targets the Komari backend. App Router entries live in `src/app/`; components, contexts, hooks, API helpers, and types use their `src/` directories. UI primitives belong in `src/components/ui/`, translations in `src/i18n/locales/`, and static assets in `public/`. Theme metadata lives at the repository root. Do not commit generated `dist/` output.

## Build, Test, and Development Commands

Use Node.js 22 and install locked dependencies with `npm ci`.

- `npm run dev`: serve locally at `http://localhost:3000`.
- `npm run build`: export the site to `dist/` and protect Komari placeholders.
- `npm run lint` / `npm run typecheck`: run ESLint and TypeScript checks.
- `npm test`: run the Vitest suite once.
- `npm run i18n:sync:dry`: preview catalog synchronization.
- `./build-theme.sh`: build and package the theme; requires `zip`.

## Coding Style & Naming Conventions

Follow the existing TypeScript/React style and ESLint rules. Use two-space indentation, functional components, and the `@/` alias for `src/`. Use PascalCase for components (`NodeDisplay.tsx`), a `use` prefix for hooks, and camelCase for utilities. Put user-facing strings in locale JSON and keep shared state in contexts.

## Testing Guidelines

Place Vitest files beside the code under test as `*.test.ts` or `*.test.tsx`; no coverage threshold is configured. Before submitting, run lint, type checking, tests, and a production build. Test visual changes against a Komari backend at desktop and mobile sizes in light and dark modes.

## Commit & Pull Request Guidelines

Use short, action-oriented subjects such as `Fix #57`; locale automation uses `chore(i18n): ...`. Create one focused local commit per completed task and never push without explicit instruction. Pull requests should describe behavior and validation, link issues, and include before/after screenshots for UI changes.

## Configuration & Security

Set `NEXT_PUBLIC_API_TARGET` in ignored `.env.local`; it defaults to `http://127.0.0.1:25774`. Never commit credentials, environment files, or generated theme archives.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
