export type ExerciseHistoryItem = {
    sessionExerciseId: string
    workoutSessionId: string
    workoutId: string
    workoutName: string
    performedAt: string
    sets: {
        setNumber: number
        weight: number | null
        reps: number | null
    }[]
}

export type WorkoutExerciseHistory = {
  exerciseId: string
  name: string
  type: 'WEIGHTED' | 'BODYWEIGHT'
  recent: ExerciseHistoryItem[]
}

import { dbPromise } from '@/db/database'

export async function getRecentExerciseHistory(
    exerciseId: string,
    limit = 3,
): Promise<ExerciseHistoryItem[]> {
    const db = await dbPromise

    const sessions = await db.getAllAsync<{
        session_exercise_id: string
        workout_session_id: string
        workout_id: string
        workout_name: string
        performed_at: string
    }>(
        `
      SELECT
        se.id AS session_exercise_id,
        ws.id AS workout_session_id,
        w.id AS workout_id,
        w.name AS workout_name,
        ws.finished_at AS performed_at
      FROM session_exercises se

      JOIN workout_sessions ws
        ON ws.id = se.workout_session_id

      JOIN workouts w
        ON w.id = ws.workout_id

      WHERE se.exercise_id = ?
        AND se.is_skipped = 0
        AND ws.finished_at IS NOT NULL
        AND EXISTS (
        SELECT 1
        FROM set_records sr
        WHERE sr.session_exercise_id = se.id
          AND sr.reps IS NOT NULL
      )
      ORDER BY ws.finished_at DESC
      LIMIT ?
    `,
        exerciseId,
        limit,
    )

    const history: ExerciseHistoryItem[] = []

    for (const session of sessions) {
        const sets = await db.getAllAsync<{
            set_number: number
            weight: number | null
            reps: number | null
        }>(
            `
        SELECT
          set_number,
          weight,
          reps
        FROM set_records
        WHERE session_exercise_id = ?
          AND reps IS NOT NULL
        ORDER BY set_number ASC
      `,
            session.session_exercise_id,
        )

        history.push({
            sessionExerciseId: session.session_exercise_id,
            workoutSessionId: session.workout_session_id,
            workoutId: session.workout_id,
            workoutName: session.workout_name,
            performedAt: session.performed_at,
            sets: sets.map((set) => ({
                setNumber: set.set_number,
                weight: set.weight,
                reps: set.reps,
            })),
        })
    }

    return history
}

export async function getExerciseHistory(
  exerciseId: string,
): Promise<ExerciseHistoryItem[]> {
  const db = await dbPromise

  const sessions = await db.getAllAsync<{
    session_exercise_id: string
    workout_session_id: string
    workout_id: string
    workout_name: string
    performed_at: string
  }>(
    `
      SELECT
        se.id AS session_exercise_id,
        ws.id AS workout_session_id,
        w.id AS workout_id,
        w.name AS workout_name,
        ws.finished_at AS performed_at
      FROM session_exercises se

      JOIN workout_sessions ws
        ON ws.id = se.workout_session_id

      JOIN workouts w
        ON w.id = ws.workout_id

      WHERE se.exercise_id = ?
        AND se.is_skipped = 0
        AND ws.finished_at IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM set_records sr
          WHERE sr.session_exercise_id = se.id
            AND sr.reps IS NOT NULL
        )

      ORDER BY ws.finished_at DESC
    `,
    exerciseId,
  )

  const history: ExerciseHistoryItem[] = []

  for (const session of sessions) {
    const sets = await db.getAllAsync<{
      set_number: number
      weight: number | null
      reps: number | null
    }>(
      `
        SELECT
          set_number,
          weight,
          reps
        FROM set_records
        WHERE session_exercise_id = ?
          AND reps IS NOT NULL
        ORDER BY set_number ASC
      `,
      session.session_exercise_id,
    )

    history.push({
      sessionExerciseId: session.session_exercise_id,
      workoutSessionId: session.workout_session_id,
      workoutId: session.workout_id,
      workoutName: session.workout_name,
      performedAt: session.performed_at,

      sets: sets.map((set) => ({
        setNumber: set.set_number,
        weight: set.weight,
        reps: set.reps,
      })),
    })
  }

  return history
}

export async function getWorkoutHistory(
  workoutId: string,
): Promise<WorkoutExerciseHistory[]> {
  const db = await dbPromise

  const exercises = await db.getAllAsync<{
    exercise_id: string
    name: string
    type: 'WEIGHTED' | 'BODYWEIGHT'
    position: number
  }>(
    `
      SELECT
        we.exercise_id,
        e.name,
        e.type,
        we.position
      FROM workout_exercises we

      JOIN exercises e
        ON e.id = we.exercise_id

      WHERE we.workout_id = ?

      ORDER BY we.position ASC
    `,
    workoutId,
  )

  const history: WorkoutExerciseHistory[] = []

  for (const exercise of exercises) {
    const recent = await getRecentExerciseHistoryForWorkout(
      workoutId,
      exercise.exercise_id,
      3,
    )

    history.push({
      exerciseId: exercise.exercise_id,
      name: exercise.name,
      type: exercise.type,
      recent,
    })
  }

  return history
}

async function getRecentExerciseHistoryForWorkout(
  workoutId: string,
  exerciseId: string,
  limit: number,
): Promise<ExerciseHistoryItem[]> {
  const db = await dbPromise

  const sessions = await db.getAllAsync<{
    session_exercise_id: string
    workout_session_id: string
    workout_id: string
    workout_name: string
    performed_at: string
  }>(
    `
      SELECT
        se.id AS session_exercise_id,
        ws.id AS workout_session_id,
        w.id AS workout_id,
        w.name AS workout_name,
        ws.finished_at AS performed_at
      FROM session_exercises se

      JOIN workout_sessions ws
        ON ws.id = se.workout_session_id

      JOIN workouts w
        ON w.id = ws.workout_id

      WHERE se.exercise_id = ?
        AND ws.workout_id = ?
        AND se.is_skipped = 0
        AND ws.finished_at IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM set_records sr
          WHERE sr.session_exercise_id = se.id
            AND sr.reps IS NOT NULL
        )

      ORDER BY ws.finished_at DESC
      LIMIT ?
    `,
    exerciseId,
    workoutId,
    limit,
  )

  const history: ExerciseHistoryItem[] = []

  for (const session of sessions) {
    const sets = await db.getAllAsync<{
      set_number: number
      weight: number | null
      reps: number | null
    }>(
      `
        SELECT
          set_number,
          weight,
          reps
        FROM set_records
        WHERE session_exercise_id = ?
          AND reps IS NOT NULL
        ORDER BY set_number ASC
      `,
      session.session_exercise_id,
    )

    history.push({
      sessionExerciseId: session.session_exercise_id,
      workoutSessionId: session.workout_session_id,
      workoutId: session.workout_id,
      workoutName: session.workout_name,
      performedAt: session.performed_at,

      sets: sets.map((set) => ({
        setNumber: set.set_number,
        weight: set.weight,
        reps: set.reps,
      })),
    })
  }

  return history
}