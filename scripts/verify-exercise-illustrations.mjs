#!/usr/bin/env node
/**
 * Static check that every built-in exercise has artwork and that nothing in
 * the map is stale. Kept separate from verify-migrations.mjs: that script is
 * about the schema chain and seed data, this one is about bundled assets, and
 * merging them would blur both.
 *
 * Metro resolves require() at build time, so a key that is in the seed but not
 * in the map fails silently at runtime — the row just loses its image. This
 * turns that into a build failure instead.
 *
 *   node scripts/verify-exercise-illustrations.mjs
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')

const seedFile = join(root, 'data', 'builtInExercises.ts')
const mapFile = join(root, 'constants', 'exerciseIllustrations.ts')
const assetsDir = join(root, 'assets', 'illustrations', 'exercises')

const problems = []
const notes = []

function check(condition, message) {
  if (!condition) {
    problems.push(message)
  }
}

// 1. The seed's source keys, which are the source of truth for coverage.
const seedKeys = [
  ...readFileSync(seedFile, 'utf8').matchAll(/sourceKey:\s*'([a-z0-9_]+)'/g),
].map((match) => match[1])

check(
  new Set(seedKeys).size === seedKeys.length,
  'data/builtInExercises.ts contains a duplicate sourceKey',
)

// 2. The keys the map claims, taken together with the file each one requires,
//    so a copy-paste that points a key at the wrong asset is caught too.
const mapped = [
  ...readFileSync(mapFile, 'utf8').matchAll(
    /^\s{2}([a-z0-9_]+): require\('@\/assets\/illustrations\/exercises\/([a-z0-9_]+)\.webp'\),$/gm,
  ),
].map((match) => ({ key: match[1], file: match[2] }))

const mappedKeys = mapped.map((entry) => entry.key)

check(
  new Set(mappedKeys).size === mappedKeys.length,
  'constants/exerciseIllustrations.ts contains a duplicate key',
)

for (const { key, file } of mapped) {
  check(
    key === file,
    `Illustration key ${key} points at ${file}.webp; the filename must match the source key`,
  )
}

// 3. Coverage in both directions.
const seedSet = new Set(seedKeys)
const mappedSet = new Set(mappedKeys)

const missing = seedKeys.filter((key) => !mappedSet.has(key))
const extra = mappedKeys.filter((key) => !seedSet.has(key))

check(
  missing.length === 0,
  `Built-in exercises with no illustration: ${missing.join(', ')}`,
)

check(
  extra.length === 0,
  `Illustrations for unknown source keys: ${extra.join(', ')}`,
)

// 4. Every required file is actually on disk, and no asset is unreferenced.
for (const { file } of mapped) {
  check(
    existsSync(join(assetsDir, `${file}.webp`)),
    `Missing asset file ${file}.webp`,
  )
}

const assetFiles = readdirSync(assetsDir)
  .filter((name) => name.endsWith('.webp'))
  .map((name) => name.replace(/\.webp$/, ''))

const orphans = assetFiles.filter((name) => !mappedSet.has(name))

check(
  orphans.length === 0,
  `Asset files nothing requires: ${orphans.join(', ')}`,
)

notes.push(`${seedKeys.length} built-in exercises`)
notes.push(`${mappedKeys.length} mapped illustrations, ${assetFiles.length} asset files`)
notes.push(`${missing.length} missing, ${extra.length} extra`)

for (const note of notes) {
  console.log(`· ${note}`)
}

if (problems.length > 0) {
  console.error('\nIllustration coverage verification failed:')

  for (const problem of problems) {
    console.error(`  ✗ ${problem}`)
  }

  process.exit(1)
}

console.log('\nEvery built-in exercise has an illustration.')
