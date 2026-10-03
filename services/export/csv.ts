import type { ExportSnapshot } from '@/repositories/exportRepository'

/**
 * CSV package: one file per table, related by the same ids the app stores, so
 * a spreadsheet can join them and a future import can rebuild the graph.
 *
 * Conventions, documented here because an importer will need them:
 * - UTF-8, RFC 4180 quoting, CRLF row endings.
 * - Booleans are the literals `true` / `false`.
 * - Null is an empty field. An empty *string* is written as `""`, which is how
 *   an importer can tell the two apart.
 * - Timestamps are ISO 8601, exactly as stored.
 * - Numbers are machine-readable and locale-independent: `52.5`, never `52,5`.
 *   Spreadsheets localize the display; the file stays portable.
 * - Muscle lists are `|`-separated, e.g. `TRICEPS|FRONT_DELTS`. The delimiter
 *   cannot occur inside a muscle key, which is always `[A-Z_]+`.
 */
export type CsvFile = {
  name: string
  contents: string
}

const ROW_SEPARATOR = '\r\n'

/** Muscle keys are uppercase and underscored, so this can never collide. */
const MUSCLE_SEPARATOR = '|'

type CsvValue = string | number | boolean | null | undefined

/**
 * RFC 4180: a field is quoted when it contains a comma, a quote, CR or LF, and
 * an embedded quote is doubled. Quoting unconditionally would be simpler but
 * makes null indistinguishable from an empty string.
 */
function escapeField(value: CsvValue): string {
  if (value === null || value === undefined) {
    return ''
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }

  if (typeof value === 'number') {
    // Guards against a NaN or Infinity reaching the file as a bare word.
    return Number.isFinite(value) ? String(value) : ''
  }

  // An empty string is quoted so it survives as `""`, distinct from the bare
  // empty field that means null. Everything else is quoted only when it has
  // to be, keeping the files readable.
  if (value !== '' && !/[",\r\n]/.test(value)) {
    return value
  }

  return `"${value.replace(/"/g, '""')}"`
}

function toCsv(header: string[], rows: CsvValue[][]): string {
  const lines = [header.join(',')]

  for (const row of rows) {
    lines.push(row.map(escapeField).join(','))
  }

  // Trailing separator so the file ends with a complete record.
  return lines.join(ROW_SEPARATOR) + ROW_SEPARATOR
}

/**
 * Every file is emitted even when its table is empty: a header-only CSV is a
 * valid, self-describing file, and an importer can rely on all seven existing.
 */
export function buildCsvFiles(snapshot: ExportSnapshot): CsvFile[] {
  return [
    {
      name: 'workouts.csv',
      contents: toCsv(
        ['id', 'name', 'is_archived', 'created_at', 'updated_at'],
        snapshot.workouts.map((workout) => [
          workout.id,
          workout.name,
          workout.isArchived,
          workout.createdAt,
          workout.updatedAt,
        ]),
      ),
    },

    {
      name: 'workout_exercises.csv',
      contents: toCsv(
        [
          'id',
          'workout_id',
          'exercise_id',
          'position',
          'sets',
          'rep_min',
          'rep_max',
        ],
        snapshot.workoutExercises.map((entry) => [
          entry.id,
          entry.workoutId,
          entry.exerciseId,
          entry.position,
          entry.sets,
          entry.repMin,
          entry.repMax,
        ]),
      ),
    },

    {
      name: 'workout_exercise_alternatives.csv',
      contents: toCsv(
        ['id', 'workout_exercise_id', 'exercise_id', 'position'],
        snapshot.workoutExerciseAlternatives.map((entry) => [
          entry.id,
          entry.workoutExerciseId,
          entry.exerciseId,
          entry.position,
        ]),
      ),
    },

    {
      name: 'exercises.csv',
      contents: toCsv(
        [
          'id',
          'source_key',
          'name',
          'type',
          'is_built_in',
          'is_archived',
          'primary_muscle',
          'secondary_muscles',
          'created_at',
          'updated_at',
        ],
        snapshot.exercises.map((exercise) => [
          exercise.id,
          // Present for built-ins, empty for custom exercises: the stable way
          // to tell them apart, since a display name is user-editable.
          exercise.sourceKey,
          exercise.name,
          exercise.type,
          exercise.isBuiltIn,
          exercise.isArchived,
          exercise.primaryMuscle,
          exercise.secondaryMuscles.join(MUSCLE_SEPARATOR),
          exercise.createdAt,
          exercise.updatedAt,
        ]),
      ),
    },

    {
      name: 'workout_sessions.csv',
      contents: toCsv(
        [
          'id',
          'workout_id',
          'started_at',
          'finished_at',
          'paused_at',
          'total_paused_ms',
        ],
        snapshot.sessions.map((session) => [
          session.id,
          session.workoutId,
          session.startedAt,
          // Empty means the session is still unfinished; there is no status
          // column in the model, so none is invented here.
          session.finishedAt,
          session.pausedAt,
          session.totalPausedMs,
        ]),
      ),
    },

    {
      name: 'session_exercises.csv',
      contents: toCsv(
        [
          'id',
          'workout_session_id',
          'exercise_id',
          'planned_exercise_id',
          'position',
          'is_skipped',
          'planned_sets',
          'rep_min',
          'rep_max',
        ],
        snapshot.sessionExercises.map((entry) => [
          entry.id,
          entry.workoutSessionId,
          // exercise_id is what was performed; planned_exercise_id is what the
          // workout planned. They differ when the exercise was replaced during
          // the session, and both are preserved.
          entry.exerciseId,
          entry.plannedExerciseId,
          entry.position,
          entry.isSkipped,
          entry.plannedSets,
          entry.repMin,
          entry.repMax,
        ]),
      ),
    },

    {
      name: 'set_records.csv',
      contents: toCsv(
        ['id', 'session_exercise_id', 'set_number', 'weight', 'reps'],
        snapshot.setRecords.map((set) => [
          set.id,
          set.sessionExerciseId,
          set.setNumber,
          set.weight,
          // Null reps mean the set was never performed, which is the same rule
          // history and personal records use.
          set.reps,
        ]),
      ),
    },
  ]
}
