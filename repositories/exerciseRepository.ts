import * as Crypto from 'expo-crypto'
import { dbPromise } from '../db/database'
import type { Exercise, ExerciseType } from '../types/entities'
type CreateExerciseInput = {
    name: string
    targetMuscle: string
    type: ExerciseType
}

export async function createExercise(
    input: CreateExerciseInput
): Promise<Exercise> {
    const db = await dbPromise

    const exercise: Exercise = {
        id: Crypto.randomUUID(),
        name: input.name,
        targetMuscle: input.targetMuscle,
        type: input.type,
        createdAt: new Date().toISOString(),
        isArchived: false,
    }

    await db.runAsync(
        `
      INSERT INTO exercises (
        id,
        name,
        target_muscle,
        type,
        created_at
      )
      VALUES (?, ?, ?, ?, ?)
    `,
        exercise.id,
        exercise.name,
        exercise.targetMuscle,
        exercise.type,
        exercise.createdAt
    )

    return exercise
}

export async function getExercises(): Promise<Exercise[]> {
    const db = await dbPromise

    const rows = await db.getAllAsync<{
        id: string
        name: string
        target_muscle: string
        type: ExerciseType
        created_at: string
        is_archived: number
    }>(`
    SELECT
      id,
      name,
      target_muscle,
      type,
      created_at,
      is_archived
    FROM exercises
    WHERE is_archived = 0
    ORDER BY name ASC
  `)

    return rows.map((row) => ({
        id: row.id,
        name: row.name,
        targetMuscle: row.target_muscle,
        type: row.type,
        createdAt: row.created_at,
        isArchived: row.is_archived === 1,
    }))
}
export async function getExerciseById(
    id: string,
): Promise<Exercise | null> {
    const db = await dbPromise

    const row = await db.getFirstAsync<{
        id: string
        name: string
        target_muscle: string
        type: ExerciseType
        created_at: string
        is_archived: number
    }>(
        `
      SELECT
        id,
        name,
        target_muscle,
        type,
        created_at,
        is_archived
      FROM exercises
      WHERE id = ?
    `,
        id,
    )

    if (!row) {
        return null
    }

    return {
        id: row.id,
        name: row.name,
        targetMuscle: row.target_muscle,
        type: row.type,
        createdAt: row.created_at,
        isArchived: row.is_archived === 1,
    }
}

type UpdateExerciseInput = {
    name: string
    targetMuscle: string
    type: ExerciseType
}

export async function updateExercise(
    id: string,
    input: UpdateExerciseInput
): Promise<void> {
    const db = await dbPromise

    await db.runAsync(
        `
      UPDATE exercises
      SET
        name = ?,
        target_muscle = ?,
        type = ?
      WHERE id = ?
    `,
        input.name,
        input.targetMuscle,
        input.type,
        id
    )
}

export async function archiveExercise(
  exerciseId: string,
): Promise<void> {
  const db = await dbPromise

  await db.runAsync(
    `
      UPDATE exercises
      SET is_archived = 1
      WHERE id = ?
    `,
    exerciseId,
  )
}

export async function restoreExercise(
  exerciseId: string,
): Promise<void> {
  const db = await dbPromise

  await db.runAsync(
    `
      UPDATE exercises
      SET is_archived = 0
      WHERE id = ?
    `,
    exerciseId,
  )
}