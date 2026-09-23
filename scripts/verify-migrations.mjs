#!/usr/bin/env node
/**
 * Static release check for the migration chain and seed data. Runs on plain
 * Node — it reads files, it does not open a database, so it cannot replace a
 * real device install. See the manual steps in the audit report for that.
 *
 *   node scripts/verify-migrations.mjs
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const migrationsDir = join(root, 'db', 'migrations')

const problems = []
const notes = []

function check(condition, message) {
  if (!condition) {
    problems.push(message)
  }
}

// 1. Files on disk, ordered and gapless from 001.
const files = readdirSync(migrationsDir)
  .filter((name) => name.endsWith('.sql'))
  .sort()

files.forEach((name, index) => {
  const expected = String(index + 1).padStart(3, '0')

  check(
    name.startsWith(expected),
    `Migration ${name} breaks the sequence; expected it to start with ${expected}`,
  )
})

notes.push(`${files.length} migration files: ${files.join(', ')}`)

// 2. Every file is registered exactly once, in ascending version order.
const registry = readFileSync(join(root, 'db', 'migrations.ts'), 'utf8')
const registered = [...registry.matchAll(/version:\s*(\d+)[\s\S]*?migrations\/(\d{3}_[\w-]+\.sql)/g)]

check(
  registered.length === files.length,
  `db/migrations.ts registers ${registered.length} migrations but ${files.length} files exist`,
)

registered.forEach(([, version, file], index) => {
  check(
    Number(version) === index + 1,
    `Migration registry is out of order at entry ${index + 1}: version ${version}`,
  )
  check(
    file === files[index],
    `Migration version ${version} points at ${file}, expected ${files[index]}`,
  )
})

// 3. The muscle column rename must stay a two-step history: 005 creates the
//    original name, 006 renames it. Rewriting 005 would break upgrades.
const commercial = readFileSync(join(migrationsDir, '005_commercial_exercises.sql'), 'utf8')
const rename = readFileSync(join(migrationsDir, '006_rename_muscle_key.sql'), 'utf8')

check(
  /"key"\s+TEXT/.test(commercial) && !/muscle_key/.test(commercial),
  '005 must create the muscles table with the original "key" column',
)
check(
  /RENAME COLUMN\s+"key"\s+TO\s+muscle_key/i.test(rename),
  '006 must rename "key" to muscle_key',
)
check(
  /planned_sets/.test(readFileSync(join(migrationsDir, '007_session_planned_sets.sql'), 'utf8')),
  '007 must add planned_sets',
)

// 4. The version bump has to live inside the migration transaction.
const transactional =
  /withTransactionAsync\([\s\S]*?PRAGMA user_version = \$\{migration\.version\}/.test(registry)

check(
  transactional,
  'PRAGMA user_version must be set inside the migration transaction',
)

// 5. Seed data sanity: the taxonomy is exactly the 16 stored muscles, and
//    every built-in exercise references muscles that exist.
const muscles = readFileSync(join(root, 'data', 'muscles.ts'), 'utf8')
const muscleKeys = [...muscles.matchAll(/key:\s*'([A-Z_]+)'/g)].map(([, key]) => key)

check(
  muscleKeys.length === 16,
  `Expected 16 muscles in data/muscles.ts, found ${muscleKeys.length}`,
)

const builtIns = readFileSync(join(root, 'data', 'builtInExercises.ts'), 'utf8')
const sourceKeys = [...builtIns.matchAll(/sourceKey:\s*'([\w-]+)'/g)].map(([, key]) => key)

check(
  new Set(sourceKeys).size === sourceKeys.length,
  'Built-in exercises must have unique sourceKey values',
)

const referenced = new Set(
  [...builtIns.matchAll(/'([A-Z_]+)'/g)]
    .map(([, value]) => value)
    .filter((value) => value !== 'WEIGHTED' && value !== 'BODYWEIGHT'),
)

for (const key of referenced) {
  check(
    muscleKeys.includes(key),
    `Built-in exercises reference unknown muscle key ${key}`,
  )
}

notes.push(`${sourceKeys.length} built-in exercises, ${muscleKeys.length} muscles`)

for (const note of notes) {
  console.log(`· ${note}`)
}

if (problems.length > 0) {
  console.error('\nMigration/seed verification failed:')

  for (const problem of problems) {
    console.error(`  ✗ ${problem}`)
  }

  process.exit(1)
}

console.log('\nMigration chain and seed data look consistent.')
