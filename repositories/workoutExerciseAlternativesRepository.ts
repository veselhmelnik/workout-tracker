import { dbPromise } from '@/db/database'
import type { Exercise, ExerciseType } from '@/types/entities'
import * as Crypto from 'expo-crypto'

type Database = Awaited<typeof dbPromise>

/** A workout-exercise slot may offer at most this many alternatives. */
export const MAX_ALTERNATIVES = 3

type AlternativeRow = {
  workout_exercise_id: string
  exercise_id: string
  name: string
  type: ExerciseType
  is_built_in: number
  is_archived: number
  source_key: string | null
  created_at: string
  updated_at: string | null
}

/**
 * Alternatives for every slot in a workout, keyed by workout_exercise_id, in
 * configured order. One query for the whole workout — never one per slot.
 *
 * Archived exercises are included: a configured alternative stays visible in
 * the editor after archiving so the user can decide to remove it.
 */
export async function getWorkoutExerciseAlternativesForWorkout(
  workoutId: string,
): Promise<Map<string, Exercise[]>> {
  const db = await dbPromise

  const rows = await db.getAllAsync<AlternativeRow>(
    `
      SELECT
        a.workout_exercise_id,
        a.exercise_id,
        e.name,
        e.type,
        e.is_built_in,
        e.is_archived,
        e.source_key,
        e.created_at,
        e.updated_at

      FROM workout_exercise_alternatives a

      JOIN workout_exercises we
        ON we.id = a.workout_exercise_id

      JOIN exercises e
        ON e.id = a.exercise_id

      WHERE we.workout_id = ?

      ORDER BY
        a.workout_exercise_id ASC,
        a.position ASC
    `,
    workoutId,
  )

  const bySlot = new Map<string, Exercise[]>()

  for (const row of rows) {
    const alternatives = bySlot.get(row.workout_exercise_id) ?? []

    alternatives.push({
      id: row.exercise_id,
      name: row.name,
      type: row.type,
      isBuiltIn: Boolean(row.is_built_in),
      isArchived: Boolean(row.is_archived),
      sourceKey: row.source_key,
      createdAt: row.created_at,
      updatedAt: row.updated_at ?? row.created_at,
    })

    bySlot.set(row.workout_exercise_id, alternatives)
  }

  return bySlot
}

/**
 * Replaces the alternatives of one slot. These rows are configuration rather
 * than recorded training data, so a replace-all keeps positions contiguous
 * without special-casing insert, move and delete.
 *
 * Must run inside a transaction opened by the caller, so alternatives commit
 * with the workout they belong to.
 */
export async function setWorkoutExerciseAlternativesWithinTransaction(
  db: Database,
  workoutExerciseId: string,
  exerciseIds: string[],
): Promise<void> {
  await assertValidAlternatives(db, workoutExerciseId, exerciseIds)

  await db.runAsync(
    `
      DELETE FROM workout_exercise_alternatives
      WHERE workout_exercise_id = ?
    `,
    workoutExerciseId,
  )

  for (const [position, exerciseId] of exerciseIds.entries()) {
    await db.runAsync(
      `
        INSERT INTO workout_exercise_alternatives (
          id,
          workout_exercise_id,
          exercise_id,
          position
        )
        VALUES (?, ?, ?, ?)
      `,
      Crypto.randomUUID(),
      workoutExerciseId,
      exerciseId,
      position,
    )
  }
}

/** Standalone variant for callers that are not already in a transaction. */
export async function setWorkoutExerciseAlternatives(
  workoutExerciseId: string,
  exerciseIds: string[],
): Promise<void> {
  const db = await dbPromise

  await db.withTransactionAsync(async () => {
    await setWorkoutExerciseAlternativesWithinTransaction(
      db,
      workoutExerciseId,
      exerciseIds,
    )
  })
}

/**
 * The rules the UI also enforces, repeated at the persistence boundary so a
 * caller that skips the editor cannot write an invalid configuration.
 */
async function assertValidAlternatives(
  db: Database,
  workoutExerciseId: string,
  exerciseIds: string[],
): Promise<void> {
  if (exerciseIds.length > MAX_ALTERNATIVES) {
    throw new Error(
      `A workout exercise can have at most ${MAX_ALTERNATIVES} alternatives`,
    )
  }

  if (new Set(exerciseIds).size !== exerciseIds.length) {
    throw new Error('Alternatives must be distinct')
  }

  const slot = await db.getFirstAsync<{
    workout_id: string
    exercise_id: string
  }>(
    `
      SELECT
        workout_id,
        exercise_id
      FROM workout_exercises
      WHERE id = ?
    `,
    workoutExerciseId,
  )

  if (!slot) {
    throw new Error('Workout exercise not found')
  }

  if (exerciseIds.includes(slot.exercise_id)) {
    throw new Error('An exercise cannot be its own alternative')
  }

  if (exerciseIds.length === 0) {
    return
  }

  const placeholders = exerciseIds.map(() => '?').join(', ')

  // Another slot in the same workout would mean one session could record the
  // same exercise twice once replacement exists.
  const conflicting = await db.getFirstAsync<{ exercise_id: string }>(
    `
      SELECT we.exercise_id
      FROM workout_exercises we
      WHERE we.workout_id = ?
        AND we.id != ?
        AND we.exercise_id IN (${placeholders})
      LIMIT 1
    `,
    slot.workout_id,
    workoutExerciseId,
    ...exerciseIds,
  )

  if (conflicting) {
    throw new Error(
      'That exercise is already planned in this workout, so it cannot also be an alternative',
    )
  }

  const known = await db.getAllAsync<{ id: string }>(
    `
      SELECT id
      FROM exercises
      WHERE id IN (${placeholders})
    `,
    ...exerciseIds,
  )

  if (known.length !== exerciseIds.length) {
    throw new Error('An alternative exercise no longer exists')
  }
}
