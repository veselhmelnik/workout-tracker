import { dbPromise } from '@/db/database'
import type {
  ExerciseType,
  Muscle,
  MuscleGroup,
  MuscleKey,
} from '@/types/entities'
export type WorkoutSessionHistoryItem = {
  id: string
  workoutId: string
  workoutName: string
  startedAt: string
  finishedAt: string
  totalPausedDuration: number
  performedExercises: number
  plannedExercises: number
  performedSets: number
}

export type WorkoutSessionHistoryExercise = {
  sessionExerciseId: string
  exerciseId: string
  exerciseName: string
  type: ExerciseType
  position: number
  isSkipped: boolean
  plannedSets: number | null
  repMin: number | null
  repMax: number | null

  primaryMuscle: Muscle | null
  secondaryMuscles: Muscle[]

  sets: {
    setNumber: number
    weight: number | null
    reps: number | null
  }[]
}

export type WorkoutSessionHistoryDetails = {
  id: string
  workoutId: string
  workoutName: string
  startedAt: string
  finishedAt: string
  totalPausedDuration: number
  exercises: WorkoutSessionHistoryExercise[]
}

export async function getWorkoutSessions(
  workoutId?: string,
): Promise<WorkoutSessionHistoryItem[]> {
  const db = await dbPromise

  const rows = await db.getAllAsync<{
    id: string
    workout_id: string
    workout_name: string
    started_at: string
    finished_at: string
    total_paused_duration: number
    planned_exercises: number
    performed_exercises: number
    performed_sets: number
  }>(
    `
      SELECT
        ws.id,
        ws.workout_id,
        w.name AS workout_name,
        ws.started_at,
        ws.finished_at,
        ws.total_paused_duration,

        COUNT(DISTINCT se.id) AS planned_exercises,

        COUNT(
          DISTINCT CASE
            WHEN se.is_skipped = 0
              AND EXISTS (
                SELECT 1
                FROM set_records sr2
                WHERE sr2.session_exercise_id = se.id
                  AND sr2.reps IS NOT NULL
              )
            THEN se.id
          END
        ) AS performed_exercises,

        COUNT(
          CASE
            WHEN se.is_skipped = 0
              AND sr.reps IS NOT NULL
            THEN sr.id
          END
        ) AS performed_sets

      FROM workout_sessions ws

      JOIN workouts w
        ON w.id = ws.workout_id

      LEFT JOIN session_exercises se
        ON se.workout_session_id = ws.id

      LEFT JOIN set_records sr
        ON sr.session_exercise_id = se.id

      WHERE ws.finished_at IS NOT NULL
        AND (? IS NULL OR ws.workout_id = ?)

      GROUP BY
        ws.id,
        ws.workout_id,
        w.name,
        ws.started_at,
        ws.finished_at,
        ws.total_paused_duration

      ORDER BY ws.finished_at DESC;
    `,
    workoutId ?? null,
    workoutId ?? null,
  )

  return rows.map((row) => ({
    id: row.id,
    workoutId: row.workout_id,
    workoutName: row.workout_name,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    totalPausedDuration: row.total_paused_duration,
    plannedExercises: row.planned_exercises,
    performedExercises: row.performed_exercises,
    performedSets: row.performed_sets,
  }))
}

export async function getWorkoutSessionHistoryDetails(
  sessionId: string,
): Promise<WorkoutSessionHistoryDetails | null> {
  const db = await dbPromise

  const session = await db.getFirstAsync<{
    id: string
    workout_id: string
    workout_name: string
    started_at: string
    finished_at: string
    total_paused_duration: number
  }>(
    `
      SELECT
        ws.id,
        ws.workout_id,
        w.name AS workout_name,
        ws.started_at,
        ws.finished_at,
        ws.total_paused_duration
      FROM workout_sessions ws

      JOIN workouts w
        ON w.id = ws.workout_id

      WHERE ws.id = ?
        AND ws.finished_at IS NOT NULL;
    `,
    sessionId,
  )

  if (!session) {
    return null
  }
  const exerciseRows = await db.getAllAsync<{
    session_exercise_id: string
    exercise_id: string
    exercise_name: string
    exercise_type: ExerciseType
    position: number
    is_skipped: number
    rep_min: number | null
    rep_max: number | null
    planned_sets: number | null
    muscle_id: string | null
    muscle_key: MuscleKey | null
    muscle_name: string | null
    muscle_group: MuscleGroup | null
    muscle_role: 'PRIMARY' | 'SECONDARY' | null
  }>(
    `
      SELECT
        se.id AS session_exercise_id,
        se.exercise_id,
        e.name AS exercise_name,
        e.type AS exercise_type,
        se.position,
        se.is_skipped,
        se.planned_sets,
        se.rep_min,
        se.rep_max,

        m.id AS muscle_id,
        m.muscle_key,
        m.name AS muscle_name,
        m.group_key AS muscle_group,
        em.role AS muscle_role

      FROM session_exercises se

      JOIN exercises e
        ON e.id = se.exercise_id

      LEFT JOIN exercise_muscles em
        ON em.exercise_id = e.id

      LEFT JOIN muscles m
        ON m.id = em.muscle_id

      WHERE se.workout_session_id = ?

      ORDER BY
        se.position ASC;
    `,
    sessionId,
  )
  const exerciseMap = new Map<
    string,
    WorkoutSessionHistoryExercise
  >()

  for (const row of exerciseRows) {
    let exercise = exerciseMap.get(row.session_exercise_id)

    if (!exercise) {
      exercise = {
        sessionExerciseId: row.session_exercise_id,
        exerciseId: row.exercise_id,
        exerciseName: row.exercise_name,
        type: row.exercise_type,
        position: row.position,
        isSkipped: row.is_skipped === 1,
        plannedSets: row.planned_sets,
        repMin: row.rep_min,
        repMax: row.rep_max,
        primaryMuscle: null,
        secondaryMuscles: [],
        sets: [],
      }

      exerciseMap.set(row.session_exercise_id, exercise)
    }

    if (
      row.muscle_id &&
      row.muscle_key &&
      row.muscle_name &&
      row.muscle_group &&
      row.muscle_role
    ) {
      const muscle: Muscle = {
        id: row.muscle_id,
        key: row.muscle_key,
        name: row.muscle_name,
        group: row.muscle_group,
      }

      if (row.muscle_role === 'PRIMARY') {
        exercise.primaryMuscle = muscle
      } else {
        exercise.secondaryMuscles.push(muscle)
      }
    }
  }
  const setRows = await db.getAllAsync<{
    session_exercise_id: string
    set_number: number
    weight: number | null
    reps: number | null
  }>(
    `
      SELECT
        sr.session_exercise_id,
        sr.set_number,
        sr.weight,
        sr.reps

      FROM set_records sr

      JOIN session_exercises se
        ON se.id = sr.session_exercise_id

      WHERE se.workout_session_id = ?
        AND sr.reps IS NOT NULL

      ORDER BY
        se.position ASC,
        sr.set_number ASC;
    `,
    sessionId,
  )
  for (const row of setRows) {
    const exercise = exerciseMap.get(row.session_exercise_id)

    if (!exercise) {
      continue
    }

    exercise.sets.push({
      setNumber: row.set_number,
      weight: row.weight,
      reps: row.reps,
    })
  }

  return {
    id: session.id,
    workoutId: session.workout_id,
    workoutName: session.workout_name,
    startedAt: session.started_at,
    finishedAt: session.finished_at,
    totalPausedDuration: session.total_paused_duration,
    exercises: [...exerciseMap.values()],
  }
}

export type WorkoutWithSessions = {
  id: string
  name: string
  isArchived: boolean
  sessionCount: number
}

/**
 * Workouts that have finished sessions, including archived ones, so their
 * history stays filterable after the workout itself is retired.
 */
export async function getWorkoutsWithSessions(): Promise<WorkoutWithSessions[]> {
  const db = await dbPromise

  const rows = await db.getAllAsync<{
    id: string
    name: string
    is_archived: number
    session_count: number
  }>(`
      SELECT
        w.id,
        w.name,
        w.is_archived,
        COUNT(ws.id) AS session_count

      FROM workouts w

      JOIN workout_sessions ws
        ON ws.workout_id = w.id
        AND ws.finished_at IS NOT NULL

      GROUP BY w.id, w.name, w.is_archived

      ORDER BY
        w.is_archived ASC,
        w.name COLLATE NOCASE ASC;
    `)

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    isArchived: row.is_archived === 1,
    sessionCount: row.session_count,
  }))
}
