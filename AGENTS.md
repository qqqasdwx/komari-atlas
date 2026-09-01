# Repository Guidelines

## Project Structure & Module Organization

This Next.js 16, React 19, and TypeScript frontend targets the Komari backend. App Router entries live in `src/app/`. Feature components are in `src/components/`, UI primitives in `src/components/ui/`, and administration views in `src/components/admin/`. Shared state belongs in `src/contexts/`; hooks, API code, types, and helpers belong in their matching `src/` directories. Translation catalogs are in `src/i18n/locales/`, static files in `public/`, and theme metadata at the repository root. Do not commit generated `dist/` output.

## Build, Test, and Development Commands

Use Node.js 22 and install the locked dependency set with `npm ci`.

- `npm run dev`: start the development server at `http://localhost:3000`.
- `npm run build`: create the static export in `dist/`, then protect Komari placeholders.
- `npm run lint`: run the repository's configured ESLint check.
- `npm run typecheck`: run strict TypeScript validation without producing files.
- `npm test`: run the Vitest unit tests once.
- `npm run i18n:sync:dry`: preview translation synchronization without modifying catalogs.
- `./build-theme.sh`: build and package a distributable theme; requires `zip`.

## Coding Style & Naming Conventions

Follow the existing TypeScript/React style and ESLint configuration. Use two-space indentation, functional components, and the `@/` alias for imports from `src/`. Name components and component files in PascalCase (`NodeDisplay.tsx`), hooks with a `use` prefix (`usePingStats.tsx`), and utilities in camelCase. Keep UI primitives in `src/components/ui/`; do not duplicate context-owned state. Put user-facing strings in locale JSON rather than inline literals.

## Testing Guidelines

Vitest is the automated test framework; there is currently no coverage threshold. Place tests beside the code under test as `*.test.ts` or `*.test.tsx`. Before submitting, run lint, type checking, tests, and a production build. Manually exercise affected flows against a Komari backend, including responsive layouts and light and dark modes for visual changes.

## Commit & Pull Request Guidelines

History favors short, action-oriented subjects such as `Fix #57`; automated locale updates use `chore(i18n): ...`. Create a focused local commit after each completed task. Never push unless the repository owner explicitly instructs you to do so. Pull requests should explain behavior changes, validation, linked issues, and include before/after screenshots for UI work. Call out translation, theme metadata, or environment changes.

## Configuration & Security

Set the local backend through `NEXT_PUBLIC_API_TARGET` in an ignored `.env.local`; the default is `http://127.0.0.1:25774`. Never commit credentials, local environment files, or generated theme archives.
