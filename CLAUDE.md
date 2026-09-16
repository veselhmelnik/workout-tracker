# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

- `npm start` — Expo dev server (`npm run android` / `ios` / `web` to target a platform)
- `npx tsc --noEmit` — type-check (there is no lint or test setup yet)
- `npx expo install <pkg>` — add dependencies so versions match Expo SDK 57

## Stack

Expo SDK 57, React Native 0.86, React 19, expo-router (file-based, typed routes enabled), expo-sqlite for local persistence, expo-crypto for UUIDs. TypeScript strict; `@/*` path alias maps to the repo root.

## Architecture

Offline-only workout tracker. Layers:

- **`app/`** — expo-router routes. Root `Stack` → `(tabs)` with three tabs: `index` (Workout), `exercises`, `history`. The screens are currently placeholders. `app/(tabs)/_layout.tsx` runs `migrateDb()` on mount — this is the only place the DB schema is initialized.
- **`db/`** — `database.ts` exports `dbPromise` (actually a sync `openDatabaseSync` handle; repositories `await` it anyway). `migrations.ts` versions the schema with `PRAGMA user_version`: add new migrations as a new `if (version < N)` block that ends with `PRAGMA user_version = N`; never edit existing blocks.
- **`repositories/`** — all SQL lives here. Each function awaits `dbPromise`, runs raw SQL, and maps snake_case rows to camelCase types. Multi-statement writes use `db.withTransactionAsync`. UI code should call repositories, not the DB directly.
- **`types/entities.ts`** — domain types mirroring the tables (booleans stored as INTEGER 0/1, timestamps as ISO strings, IDs as UUID TEXT).
- **`components/`** — `ui/` holds the primitives (`Button`, `ScreenHeader`, `Fields`, `StateViews`) built from `constants/theme.ts`; `workout/` and `exercise/` hold the editor screens' shared bodies and their modals. `hooks/useAsyncData.ts` loads repository data and reloads on screen focus; `utils/` has formatting and grouping helpers.
- `components/EditScreenInfo.tsx`, `ExternalLink.tsx`, `StyledText.tsx`, `Themed.tsx`, `useClientOnlyValue*`, `useColorScheme*` and `constants/Colors.ts` are unused Expo template leftovers. `ExternalLink.tsx` fails `tsc` against typed routes.

### Domain model

- **Templates**: `exercises` (`WEIGHTED` | `BODYWEIGHT`) and `workouts`, linked by ordered `workout_exercises` (sets, rep range, `position`). Exercises and workouts are soft-deleted via `is_archived`, never hard-deleted (sessions reference them).
- **Sessions**: `startWorkout` snapshots a workout's template into `workout_sessions` → `session_exercises` (copies position and rep range) → `set_records`. Only one unfinished session may exist at a time (`getActiveWorkoutSession`).
- Pause tracking: `paused_at` marks an active pause; on resume/finish the elapsed ms is added to `total_paused_duration`.
- `finishWorkout` auto-marks exercises with no logged reps as skipped. History queries (`historyRepository`) only consider finished sessions, non-skipped exercises, and sets where `reps IS NOT NULL`.
