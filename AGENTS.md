# Repository Guidelines

## Project Structure & Module Organization

This is an offline-first gym-log PWA built with React, TypeScript, Vite, and
Dexie. Application code lives in `src/`:

- `src/features/` contains page-level flows (`workout`, `exercises`, `history`,
  `settings`, and `plans`).
- `src/components/` contains shared UI such as layout and navigation.
- `src/domain/` contains pure business rules; keep progression and formatting
  logic independent of React and IndexedDB.
- `src/db/` defines Dexie schemas, record types, migrations, and repositories.
- `src/test/setup.ts` configures Vitest and browser-like test helpers.
- `src/assets/` holds static visual assets. Global styles are in
  `src/styles.css`.

Keep tests next to the code they cover: `src/domain/progression.test.ts` is the
pattern for `src/domain/progression.ts`.

## Build, Test, and Development Commands

- `npm install` installs dependencies.
- `npm run dev` starts the Vite development server.
- `npm test` runs the complete Vitest suite once.
- `npm test -- src/domain/progressionPolicy.test.ts` runs one focused test file.
- `npm run lint` checks the repository with oxlint.
- `npm run build` type-checks with TypeScript and produces the PWA bundle in
  `dist/`.

Run test, lint, and build before proposing a change.

## Coding Style & Naming Conventions

Use TypeScript with two-space indentation, single quotes, semicolons, and
trailing commas, matching existing files. Use PascalCase for React components
and page files (`WorkoutPage.tsx`), camelCase for functions and variables, and
descriptive record types ending in `Record` (`SetResultRecord`). Prefer small,
pure functions in `src/domain/`; do not put persistence calls in them.

## Testing Guidelines

Use Vitest with Testing Library for UI and `fake-indexeddb` for Dexie tests.
Write behavior-focused names such as `it('freezes the target at its configured
weight ceiling', ...)`. Add a failing test before changing domain behavior;
cover migrations when changing `src/db/appDb.ts`.

## Commit & Pull Request Guidelines

Recent history uses concise imperative summaries, for example `Add exercise
notes and change history` and `feat: add progression core`. Keep commits
focused. PRs should explain the user-facing impact, list validation commands,
and include screenshots only for UI changes. Do not include unrelated
untracked files, generated `dist/`, or local backups.
