import * as Crypto from 'expo-crypto'

import { dbPromise } from '@/db/database'
import type { Exercise, Workout } from '@/types/entities'
import {
  getWorkoutExerciseAlternativesForWorkout,
  setWorkoutExerciseAlternativesWithinTransaction,
} from './workoutExerciseAlternativesRepository'
import { syncActiveSessionWithinTransaction } from './activeSessionSync'

type CreateWorkoutExerciseInput = {
  exerciseId: string
  /** Configured slot alternatives, in order; empty when none. */
  alternativeExerciseIds: string[]
  sets: number
  repMin: number | null
  repMax: number | null
  position: number
}

type CreateWorkoutInput = {
  name: string
  exercises: CreateWorkoutExerciseInput[]
}
type UpdateWorkoutExerciseInput = {
  exerciseId: string
  /** Configured slot alternatives, in order; empty when none. */
  alternativeExerciseIds: string[]
  sets: number
  repMin: number | null
  repMax: number | null
  position: number
}

type UpdateWorkoutInput = {
  name: string
  exercises: UpdateWorkoutExerciseInput[]
}

/**
 * Positions are unique per workout, so rows are parked above any value the
 * new layout can use before being renumbered.
 */
const POSITION_OFFSET = 10_000
export type WorkoutDetails = Workout & {
  exercises: {
    id: string
    exerciseId: string
    name: string
    /** Configured alternatives for this slot, archived ones included. */
    alternatives: Exercise[]
    type: 'WEIGHTED' | 'BODYWEIGHT'
    sets: number
    repMin: number | null
    repMax: number | null
    position: number
  }[]
}

export type WorkoutListItem = {
  id: string
  name: string
  exerciseCount: number
  lastPerformedAt: string | null
}

export async function createWorkout(
  input: CreateWorkoutInput
): Promise<Workout> {
  const db = await dbPromise

  const now = new Date().toISOString()

  const workout: Workout = {
    id: Crypto.randomUUID(),
    name: input.name,
    createdAt: now,
    updatedAt: now,
    isArchived: false
  }

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `
        INSERT INTO workouts (
          id,
          name,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?)
      `,
      workout.id,
      workout.name,
      workout.createdAt,
      workout.updatedAt
    )

    for (const exercise of input.exercises) {
      // Generated here so alternatives can be attached to the slot in this
      // same transaction, without reopening the editor after creation.
      const workoutExerciseId = Crypto.randomUUID()

      await db.runAsync(
        `
          INSERT INTO workout_exercises (
            id,
            workout_id,
            exercise_id,
            sets,
            rep_min,
            rep_max,
            position
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        workoutExerciseId,
        workout.id,
        exercise.exerciseId,
        exercise.sets,
        exercise.repMin,
        exercise.repMax,
        exercise.position
      )

      await setWorkoutExerciseAlternativesWithinTransaction(
        db,
        workoutExerciseId,
        exercise.alternativeExerciseIds,
      )
    }
  })

  return workout
}

export async function getWorkoutById(
  id: string,
): Promise<WorkoutDetails | null> {
  const db = await dbPromise

  const workout = await db.getFirstAsync<{
    id: string
    name: string
    created_at: string
    updated_at: string
    is_archived: number
  }>(
    `
      SELECT
        id,
        name,
        created_at,
        updated_at,
        is_archived
      FROM workouts
      WHERE id = ?
    `,
    id,
  )

  if (!workout) {
    return null
  }

  const exercises = await db.getAllAsync<{
    id: string
    exercise_id: string
    name: string
    type: 'WEIGHTED' | 'BODYWEIGHT'
    sets: number
    rep_min: number | null
    rep_max: number | null
    position: number
  }>(
    `
      SELECT
        we.id,
        we.exercise_id,
        e.name,
        e.type,
        we.sets,
        we.rep_min,
        we.rep_max,
        we.position
      FROM workout_exercises we
      JOIN exercises e
        ON e.id = we.exercise_id
      WHERE we.workout_id = ?
      ORDER BY we.position ASC
    `,
    id,
  )

  // One batched query for every slot's alternatives, not one per exercise.
  const alternativesBySlot = await getWorkoutExerciseAlternativesForWorkout(id)

  return {
    id: workout.id,
    name: workout.name,
    createdAt: workout.created_at,
    updatedAt: workout.updated_at,
    isArchived: workout.is_archived === 1,

    exercises: exercises.map((exercise) => ({
      id: exercise.id,
      exerciseId: exercise.exercise_id,
      name: exercise.name,
      alternatives: alternativesBySlot.get(exercise.id) ?? [],
      type: exercise.type,
      sets: exercise.sets,
      repMin: exercise.rep_min,
      repMax: exercise.rep_max,
      position: exercise.position,
    })),
  }
}

export async function getWorkouts(): Promise<WorkoutListItem[]> {
  const db = await dbPromise

  const rows = await db.getAllAsync<{
    id: string
    name: string
    exercise_count: number
    last_performed_at: string | null
  }>(`
  SELECT
    w.id,
    w.name,
    COUNT(DISTINCT we.id) AS exercise_count,
    MAX(ws.finished_at) AS last_performed_at
  FROM workouts w

  LEFT JOIN workout_exercises we
    ON we.workout_id = w.id

  LEFT JOIN workout_sessions ws
    ON ws.workout_id = w.id
    AND ws.finished_at IS NOT NULL

  WHERE w.is_archived = 0

  GROUP BY w.id
  ORDER BY w.created_at DESC
`)

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    exerciseCount: row.exercise_count,
    lastPerformedAt: row.last_performed_at,
  }))
}

export async function updateWorkout(
  workoutId: string,
  input: UpdateWorkoutInput,
): Promise<void> {
  const db = await dbPromise

  const updatedAt = new Date().toISOString()

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `
        UPDATE workouts
        SET
          name = ?,
          updated_at = ?
        WHERE id = ?
      `,
      input.name,
      updatedAt,
      workoutId,
    )

    // Slot rows are updated in place rather than rebuilt, so their ids stay
    // stable across saves. Anything keyed to a slot — configured alternatives
    // above all — would be destroyed by a delete-all/insert-all rewrite.
    const existingRows = await db.getAllAsync<{
      id: string
      exercise_id: string
    }>(
      `
        SELECT
          id,
          exercise_id
        FROM workout_exercises
        WHERE workout_id = ?
      `,
      workoutId,
    )

    const existingByExerciseId = new Map(
      existingRows.map((row) => [row.exercise_id, row]),
    )

    const keptExerciseIds = new Set(
      input.exercises.map((exercise) => exercise.exerciseId),
    )

    for (const row of existingRows) {
      if (!keptExerciseIds.has(row.exercise_id)) {
        await db.runAsync(
          `
            DELETE FROM workout_exercises
            WHERE id = ?
          `,
          row.id,
        )
      }
    }

    // Park retained rows above every final position first: swapping two
    // neighbours would otherwise collide with UNIQUE(workout_id, position)
    // midway through the renumbering.
    await db.runAsync(
      `
        UPDATE workout_exercises
        SET position = position + ?
        WHERE workout_id = ?
      `,
      POSITION_OFFSET,
      workoutId,
    )

    for (const exercise of input.exercises) {
      const existing = existingByExerciseId.get(exercise.exerciseId)

      if (existing) {
        await db.runAsync(
          `
            UPDATE workout_exercises
            SET
              sets = ?,
              rep_min = ?,
              rep_max = ?,
              position = ?
            WHERE id = ?
          `,
          exercise.sets,
          exercise.repMin,
          exercise.repMax,
          exercise.position,
          existing.id,
        )

        await setWorkoutExerciseAlternativesWithinTransaction(
          db,
          existing.id,
          exercise.alternativeExerciseIds,
        )

        continue
      }

      const workoutExerciseId = Crypto.randomUUID()

      await db.runAsync(
        `
          INSERT INTO workout_exercises (
            id,
            workout_id,
            exercise_id,
            sets,
            rep_min,
            rep_max,
            position
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        workoutExerciseId,
        workoutId,
        exercise.exerciseId,
        exercise.sets,
        exercise.repMin,
        exercise.repMax,
        exercise.position,
      )

      await setWorkoutExerciseAlternativesWithinTransaction(
        db,
        workoutExerciseId,
        exercise.alternativeExerciseIds,
      )
    }

    // Same transaction as the template write: an unfinished session for this
    // workout either follows the saved template or nothing is committed.
    await syncActiveSessionWithinTransaction(
      db,
      workoutId,
      [...input.exercises]
        .sort((a, b) => a.position - b.position)
        .map((exercise) => ({
          exerciseId: exercise.exerciseId,
          sets: exercise.sets,
          repMin: exercise.repMin,
          repMax: exercise.repMax,
        })),
    )
  })
}

export async function archiveWorkout(
  workoutId: string,
): Promise<void> {
  const db = await dbPromise

  await db.runAsync(
    `
      UPDATE workouts
      SET
        is_archived = 1,
        updated_at = ?
      WHERE id = ?
    `,
    new Date().toISOString(),
    workoutId,
  )
}

export async function restoreWorkout(
  workoutId: string,
): Promise<void> {
  const db = await dbPromise

  await db.runAsync(
    `
      UPDATE workouts
      SET
        is_archived = 0,
        updated_at = ?
      WHERE id = ?
    `,
    new Date().toISOString(),
    workoutId,
  )
}