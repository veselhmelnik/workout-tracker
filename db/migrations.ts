import { dbPromise } from './database'

type Database = Awaited<typeof dbPromise>

/**
 * Runs one migration version inside a transaction, so its statements and the
 * PRAGMA user_version bump either all apply or all roll back together.
 */
async function runMigration(db: Database, sql: string) {
  await db.withTransactionAsync(async () => {
    await db.execAsync(sql)
  })
}

export async function migrateDb() {
  const db = await dbPromise

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `)

  const result = await db.getFirstAsync<{
    user_version: number
  }>('PRAGMA user_version')

  const version = result?.user_version ?? 0

  // The connection PRAGMAs above cannot change inside a transaction, so only
  // the versioned steps below are wrapped.
  if (version < 1) {
    await runMigration(db, `
      CREATE TABLE IF NOT EXISTS exercises (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        target_muscle TEXT NOT NULL,
        type TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS workouts (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS workout_exercises (
        id TEXT PRIMARY KEY NOT NULL,

        workout_id TEXT NOT NULL,
        exercise_id TEXT NOT NULL,

        sets INTEGER NOT NULL,
        rep_min INTEGER,
        rep_max INTEGER,

        position INTEGER NOT NULL,

        UNIQUE (workout_id, exercise_id),
        UNIQUE (workout_id, position),

        FOREIGN KEY (workout_id)
          REFERENCES workouts(id)
          ON DELETE CASCADE,

        FOREIGN KEY (exercise_id)
          REFERENCES exercises(id)
      );

      CREATE TABLE IF NOT EXISTS workout_sessions (
        id TEXT PRIMARY KEY NOT NULL,

        workout_id TEXT NOT NULL,

        started_at TEXT NOT NULL,
        finished_at TEXT,

        paused_at TEXT,
        total_paused_duration INTEGER NOT NULL DEFAULT 0,

        FOREIGN KEY (workout_id)
          REFERENCES workouts(id)
      );

      CREATE TABLE IF NOT EXISTS session_exercises (
        id TEXT PRIMARY KEY NOT NULL,

        workout_session_id TEXT NOT NULL,
        exercise_id TEXT NOT NULL,

        position INTEGER NOT NULL,
        is_skipped INTEGER NOT NULL DEFAULT 0,

        UNIQUE (workout_session_id, position),

        FOREIGN KEY (workout_session_id)
          REFERENCES workout_sessions(id)
          ON DELETE CASCADE,

        FOREIGN KEY (exercise_id)
          REFERENCES exercises(id)
      );

      CREATE TABLE IF NOT EXISTS set_records (
        id TEXT PRIMARY KEY NOT NULL,

        session_exercise_id TEXT NOT NULL,

        set_number INTEGER NOT NULL,
        weight REAL,
        reps INTEGER,

        UNIQUE (session_exercise_id, set_number),

        FOREIGN KEY (session_exercise_id)
          REFERENCES session_exercises(id)
          ON DELETE CASCADE
      );

      PRAGMA user_version = 1;
    `)
  }

  if (version < 2) {
    await runMigration(db, `
    ALTER TABLE workouts
    ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0;

    PRAGMA user_version = 2;
  `)
  }

  if (version < 3) {
    await runMigration(db, `
    ALTER TABLE exercises
    ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0;

    PRAGMA user_version = 3;
  `)
  }
  if (version < 4) {
    await runMigration(db, `
    ALTER TABLE session_exercises
    ADD COLUMN rep_min INTEGER;

    ALTER TABLE session_exercises
    ADD COLUMN rep_max INTEGER;

    PRAGMA user_version = 4;
  `)
  }
}