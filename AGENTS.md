# Repository Guidelines

## Project Structure & Module Organization

- `app/`: Expo Router routes (`layout.tsx`, nested screens). Keep route files lowercase.
- `components/`: Reusable UI (modals, bars). Use PascalCase filenames.
- `lib/`: Core logic: `api/`, `config/`, `db/` (Drizzle schema at `lib/db/schema.ts`), `player/`, `services/`.
- `hooks/`: React hooks (`queries/`, `mutations/`, `stores/`, `playerHooks/`).
- `utils/`, `types/`: Helpers and shared types. Path alias `@/*` is enabled.
- `drizzle/`: Generated SQL migrations and metadata. Do not edit by hand.
- `assets/`: Images and static assets.
- Config: `app.config.ts`, `eslint.config.mjs`, `.prettierrc`, `metro.config.js`, `eas.json`.

## Build, Test, and Development Commands

- `pnpm start`: Start Expo dev server.
- `pnpm android`: Build and run the Android app locally.
- `pnpm lint`: Lint codebase with ESLint.
- `pnpm format`: Fix ESLint issues and format with Prettier.
- Drizzle: `pnpm exec drizzle-kit generate` to create migrations from `lib/db/schema.ts`.

## Coding Style & Naming Conventions

- Language: TypeScript (strict). Use the `@/*` alias for root imports.
- Formatting: Prettier (tabs, no semicolons, single quotes, trailing commas). Run `pnpm format`.
- Linting: ESLint with React/Query/hooks rules; fix violations before committing.
- Naming: Components `PascalCase`, hooks `useXxx` camelCase, utilities camelCase. Routes in `app/` lowercase.

## Testing Guidelines

- This project has no tests.

## Commit & Pull Request Guidelines

- Commits: Use Conventional Commits (`feat:`, `fix:`, `chore:`, etc.). Example: `feat(player): add queue shuffling`.
- Before PR: Ensure `pnpm lint` and `pnpm format` pass; run locally on device/emulator for UI changes.
- PRs: Provide a clear description, link related issues, and attach screenshots or screen recordings for UI changes. Note any DB schema/migration updates (`drizzle/`).

## Security & Configuration Tips

- Secrets: Store locally in `.env.local`; do not commit credentials (e.g., analytics/Sentry DSN).
- Builds: `eas.json` defines build profiles; use EAS locally if needed (`eas build -p android --profile dev`).
