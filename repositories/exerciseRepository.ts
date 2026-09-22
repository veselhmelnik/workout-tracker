import { dbPromise } from "@/db/database"
import { Exercise, ExerciseDetails, ExerciseMuscleRoleType, ExerciseType, Muscle, MuscleGroup, MuscleKey, SaveExerciseInput, UpdateExerciseInput } from "@/types/entities"
import * as Crypto from 'expo-crypto'
type ExerciseDetailsRow = {
  exercise_id: string
  exercise_name: string
  exercise_type: ExerciseType
  is_built_in: number
  is_archived: number
  source_key: string | null
  created_at: string
  updated_at: string | null

  muscle_id: string | null
  muscle_key: MuscleKey | null
  muscle_name: string | null
  muscle_group: MuscleGroup | null
  muscle_role: ExerciseMuscleRoleType | null
}

function mapExerciseDetailsRows(
  rows: ExerciseDetailsRow[],
): ExerciseDetails[] {
  const exercises = new Map<string, ExerciseDetails>()

  for (const row of rows) {
    let details = exercises.get(row.exercise_id)

    if (!details) {
      details = {
        exercise: {
          id: row.exercise_id,
          name: row.exercise_name,
          type: row.exercise_type,
          isBuiltIn: Boolean(row.is_built_in),
          isArchived: Boolean(row.is_archived),
          sourceKey: row.source_key,
          createdAt: row.created_at,
          updatedAt: row.updated_at ?? row.created_at,
        },
        primaryMuscle: null,
        secondaryMuscles: [],
      }

      exercises.set(row.exercise_id, details)
    }

    if (
      !row.muscle_id ||
      !row.muscle_key ||
      !row.muscle_name ||
      !row.muscle_group ||
      !row.muscle_role
    ) {
      continue
    }

    const muscle: Muscle = {
      id: row.muscle_id,
      key: row.muscle_key,
      name: row.muscle_name,
      group: row.muscle_group,
    }

    if (row.muscle_role === 'PRIMARY') {
      details.primaryMuscle = muscle
    } else {
      details.secondaryMuscles.push(muscle)
    }
  }

  return [...exercises.values()]
}

const EXERCISE_DETAILS_SELECT = `
    SELECT
      e.id AS exercise_id,
      e.name AS exercise_name,
      e.type AS exercise_type,
      e.is_built_in,
      e.is_archived,
      e.source_key,
      e.created_at,
      e.updated_at,

      m.id AS muscle_id,
      m.muscle_key,
      m.name AS muscle_name,
      m.group_key AS muscle_group,
      em.role AS muscle_role

    FROM exercises e

    LEFT JOIN exercise_muscles em
      ON e.id = em.exercise_id

    LEFT JOIN muscles m
      ON em.muscle_id = m.id
`

export async function getExercises(): Promise<ExerciseDetails[]> {
  const db = await dbPromise

  const rows = await db.getAllAsync<ExerciseDetailsRow>(`
    ${EXERCISE_DETAILS_SELECT}

    WHERE e.is_archived = 0

    ORDER BY e.name ASC;
  `)

  return mapExerciseDetailsRows(rows)
}

/** Includes archived exercises, so recorded history stays reachable. */
export async function getExerciseDetailsById(
  id: string,
): Promise<ExerciseDetails | null> {
  const db = await dbPromise

  const rows = await db.getAllAsync<ExerciseDetailsRow>(
    `
    ${EXERCISE_DETAILS_SELECT}

    WHERE e.id = ?;
  `,
    id,
  )

  return mapExerciseDetailsRows(rows)[0] ?? null
}

export async function createExerciseRepository(
  input: SaveExerciseInput,
): Promise<Exercise> {
  const db = await dbPromise

  const id = Crypto.randomUUID()
  const now = new Date().toISOString()

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `
        INSERT INTO exercises (
          id,
          name,
          target_muscle,
          type,
          created_at,
          is_archived,
          is_built_in,
          source_key,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, 0, 0, NULL, ?);
      `,
      id,
      input.name,
      input.primaryMuscle,
      input.type,
      now,
      now,
    )

    await db.runAsync(
      `
        INSERT INTO exercise_muscles (
          exercise_id,
          muscle_id,
          role
        )
        VALUES (?, ?, 'PRIMARY');
      `,
      id,
      input.primaryMuscle,
    )

    for (const muscle of input.secondaryMuscles) {
      await db.runAsync(
        `
          INSERT INTO exercise_muscles (
            exercise_id,
            muscle_id,
            role
          )
          VALUES (?, ?, 'SECONDARY');
        `,
        id,
        muscle,
      )
    }
  })

  return {
    id,
    name: input.name,
    type: input.type,
    isBuiltIn: false,
    isArchived: false,
    sourceKey: null,
    createdAt: now,
    updatedAt: now,
  }
}

export async function updateExerciseRepository(
  input: UpdateExerciseInput,
): Promise<void> {
  const db = await dbPromise
  const now = new Date().toISOString()

  await db.withTransactionAsync(async () => {
    const exercise = await db.getFirstAsync<{
      id: string
      is_built_in: number
    }>(
      `
        SELECT
          id,
          is_built_in
        FROM exercises
        WHERE id = ?;
      `,
      input.id,
    )

    if (!exercise) {
      throw new Error('Exercise not found')
    }

    if (exercise.is_built_in) {
      throw new Error('Built-in exercises cannot be edited')
    }

    await db.runAsync(
      `
        UPDATE exercises
        SET
          name = ?,
          target_muscle = ?,
          type = ?,
          updated_at = ?
        WHERE id = ?;
      `,
      input.name,
      input.primaryMuscle,
      input.type,
      now,
      input.id,
    )

    await db.runAsync(
      `
        DELETE FROM exercise_muscles
        WHERE exercise_id = ?;
      `,
      input.id,
    )

    await db.runAsync(
      `
        INSERT INTO exercise_muscles (
          exercise_id,
          muscle_id,
          role
        )
        VALUES (?, ?, 'PRIMARY');
      `,
      input.id,
      input.primaryMuscle,
    )

    for (const muscle of input.secondaryMuscles) {
      await db.runAsync(
        `
          INSERT INTO exercise_muscles (
            exercise_id,
            muscle_id,
            role
          )
          VALUES (?, ?, 'SECONDARY');
        `,
        input.id,
        muscle,
      )
    }
  })
}

export async function archiveExerciseRepository(
  id: string,
): Promise<void> {
  const db = await dbPromise
  const now = new Date().toISOString()

  await db.runAsync(
    `
      UPDATE exercises
      SET
        is_archived = 1,
        updated_at = ?
      WHERE id = ?
        AND is_built_in = 0;
    `,
    now,
    id,
  )
}