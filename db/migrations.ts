import { dbPromise } from './database'
import { loadSqlAsset } from './migrationLoader'

type Database = Awaited<typeof dbPromise>

type Migration = {
  version: number
  name: string
  asset: number
}

const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial',
    asset: require('./migrations/001_initial.sql'),
  },
  {
    version: 2,
    name: 'workout_archive',
    asset: require('./migrations/002_workout_archive.sql'),
  },
  {
    version: 3,
    name: 'exercise_archive',
    asset: require('./migrations/003_exercise_archive.sql'),
  },
  {
    version: 4,
    name: 'session_snapshot',
    asset: require('./migrations/004_session_snapshot.sql'),
  },
  {
    version: 5,
    name: 'commercial_exercises',
    asset: require('./migrations/005_commercial_exercises.sql'),
  },
  {
    version: 6,
    name: 'rename_muscle_key',
    asset: require('./migrations/006_rename_muscle_key.sql'),
  },
]

async function runMigration(
  db: Database,
  migration: Migration,
) {
  const sql = await loadSqlAsset(migration.asset)

  await db.withTransactionAsync(async () => {
    await db.execAsync(sql)

    await db.execAsync(
      `PRAGMA user_version = ${migration.version};`,
    )
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

  const currentVersion = result?.user_version ?? 0

  const pendingMigrations = migrations.filter(
    (migration) => migration.version > currentVersion,
  )

  for (const migration of pendingMigrations) {
    await runMigration(db, migration)
  }
}