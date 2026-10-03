import type { ExportSnapshot } from '@/repositories/exportRepository'
import type { ExerciseType, MuscleKey } from '@/types/entities'

/**
 * Full-fidelity structured export.
 *
 * The contract, for a future importer:
 * - `version` is the format version, deliberately independent of the SQLite
 *   `user_version`. A schema migration must not silently change what an older
 *   export meant, so the two are versioned separately and only this constant
 *   moves when the export shape changes.
 * - Timestamps are ISO 8601 strings, exactly as stored.
 * - Ids are the app's own UUIDs and are preserved throughout, so relations can
 *   be rebuilt exactly.
 * - Muscles are arrays of muscle keys (`CHEST`, `TRICEPS`), never display
 *   names and never the internal muscle row id.
 * - A built-in exercise has a non-null `sourceKey`; a custom one has null and
 *   carries its full definition.
 * - On a session exercise, `exerciseId` is what was actually performed and
 *   `plannedExerciseId` is what the workout planned. They differ only when the
 *   exercise was replaced mid-session.
 * - Personal records and progress charts are absent on purpose: both are
 *   derived from `sessions[].exercises[].sets`, so the raw history is enough
 *   and cannot go stale.
 */
export const EXPORT_FORMAT = 'setline-export'
export const EXPORT_VERSION = 1

export type SetlineExport = {
  format: typeof EXPORT_FORMAT
  version: number
  exportedAt: string
  app: { name: 'Setline'; version: string | null }
  data: {
    exercises: JsonExercise[]
    workouts: JsonWorkout[]
    sessions: JsonSession[]
  }
}

type JsonExercise = {
  id: string
  sourceKey: string | null
  name: string
  type: ExerciseType
  isBuiltIn: boolean
  isArchived: boolean
  primaryMuscle: MuscleKey | null
  secondaryMuscles: MuscleKey[]
  createdAt: string
  updatedAt: string | null
}

type JsonWorkout = {
  id: string
  name: string
  isArchived: boolean
  createdAt: string
  updatedAt: string
  exercises: JsonWorkoutExercise[]
}

type JsonWorkoutExercise = {
  workoutExerciseId: string
  exerciseId: string
  position: number
  sets: number
  repMin: number | null
  repMax: number | null
  /** Configured swaps for this slot, in order. Exercise ids only. */
  alternatives: { exerciseId: string; position: number }[]
}

type JsonSession = {
  id: string
  workoutId: string
  startedAt: string
  finishedAt: string | null
  pausedMs: number
  exercises: JsonSessionExercise[]
}

type JsonSessionExercise = {
  id: string
  exerciseId: string
  plannedExerciseId: string | null
  position: number
  skipped: boolean
  plannedSets: number | null
  repMin: number | null
  repMax: number | null
  sets: { id: string; setNumber: number; weight: number | null; reps: number | null }[]
}

/**
 * Nests the flat snapshot into its domain shape. Children are grouped through
 * maps rather than repeated `filter` passes, so assembling years of history
 * stays linear rather than quadratic.
 *
 * A child whose parent is missing — which the foreign keys should prevent —
 * is kept out of the nested tree rather than crashing the export; the CSV
 * package still carries the raw row, so no history is lost either way.
 */
export function buildJsonExport(
  snapshot: ExportSnapshot,
  appVersion: string | null,
): SetlineExport {
  const alternativesBySlot = groupBy(
    snapshot.workoutExerciseAlternatives,
    (entry) => entry.workoutExerciseId,
  )

  const slotsByWorkout = groupBy(
    snapshot.workoutExercises,
    (entry) => entry.workoutId,
  )

  const setsBySessionExercise = groupBy(
    snapshot.setRecords,
    (entry) => entry.sessionExerciseId,
  )

  const exercisesBySession = groupBy(
    snapshot.sessionExercises,
    (entry) => entry.workoutSessionId,
  )

  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    app: { name: 'Setline', version: appVersion },

    data: {
      // Archived exercises are included: history references them, and an
      // import that dropped them would orphan past sessions.
      exercises: snapshot.exercises.map((exercise) => ({
        id: exercise.id,
        sourceKey: exercise.sourceKey,
        name: exercise.name,
        type: exercise.type,
        isBuiltIn: exercise.isBuiltIn,
        isArchived: exercise.isArchived,
        primaryMuscle: exercise.primaryMuscle,
        secondaryMuscles: exercise.secondaryMuscles,
        createdAt: exercise.createdAt,
        updatedAt: exercise.updatedAt,
      })),

      workouts: snapshot.workouts.map((workout) => ({
        id: workout.id,
        name: workout.name,
        isArchived: workout.isArchived,
        createdAt: workout.createdAt,
        updatedAt: workout.updatedAt,

        exercises: (slotsByWorkout.get(workout.id) ?? []).map((slot) => ({
          workoutExerciseId: slot.id,
          exerciseId: slot.exerciseId,
          position: slot.position,
          sets: slot.sets,
          repMin: slot.repMin,
          repMax: slot.repMax,

          alternatives: (alternativesBySlot.get(slot.id) ?? []).map(
            (alternative) => ({
              exerciseId: alternative.exerciseId,
              position: alternative.position,
            }),
          ),
        })),
      })),

      sessions: snapshot.sessions.map((session) => ({
        id: session.id,
        workoutId: session.workoutId,
        startedAt: session.startedAt,
        finishedAt: session.finishedAt,
        pausedMs: session.totalPausedMs,

        exercises: (exercisesBySession.get(session.id) ?? []).map((entry) => ({
          id: entry.id,
          exerciseId: entry.exerciseId,
          plannedExerciseId: entry.plannedExerciseId,
          position: entry.position,
          skipped: entry.isSkipped,
          plannedSets: entry.plannedSets,
          repMin: entry.repMin,
          repMax: entry.repMax,

          sets: (setsBySessionExercise.get(entry.id) ?? []).map((set) => ({
            id: set.id,
            setNumber: set.setNumber,
            weight: set.weight,
            reps: set.reps,
          })),
        })),
      })),
    },
  }
}

function groupBy<T>(rows: T[], keyOf: (row: T) => string): Map<string, T[]> {
  const grouped = new Map<string, T[]>()

  for (const row of rows) {
    const existing = grouped.get(keyOf(row))

    if (existing) {
      existing.push(row)
    } else {
      grouped.set(keyOf(row), [row])
    }
  }

  return grouped
}
