import { dbPromise } from '@/db/database'
import type { ExerciseType } from '@/types/entities'
import { annotateWithPersonalRecords } from '@/utils/personalRecords'
export type ExerciseHistoryItem = {
  sessionExerciseId: string
  workoutSessionId: string
  workoutId: string
  workoutName: string
  performedAt: string
  /** True when this result beat every earlier completed occurrence. */
  isPr: boolean
  sets: {
    setNumber: number
    weight: number | null
    reps: number | null
  }[]
}
export type ExerciseHistorySummary = {
  sessionCount: number

  bestSet:
  | {
    type: 'WEIGHTED'
    weight: number
    reps: number
    volume: number
  }
  | {
    type: 'BODYWEIGHT'
    reps: number
  }
  | null
}
/**
 * Loads every completed, non-skipped occurrence of an exercise with its
 * recorded sets, marks personal records across the whole history, then
 * applies the caller's limit. PRs are therefore correct even for a recent
 * slice: row 2 of 3 still shows PR if it beat all twenty earlier sessions.
 *
 * Sets for every occurrence come back in one query rather than one query per
 * session, so annotating the full history costs two queries in total.
 */
async function getExerciseHistoryInternal(
  exerciseId: string,
  limit?: number,
): Promise<ExerciseHistoryItem[]> {
  const db = await dbPromise

  const sessions = await db.getAllAsync<{
    session_exercise_id: string
    workout_session_id: string
    workout_id: string
    workout_name: string
    performed_at: string
    exercise_type: ExerciseType
  }>(
    `
      SELECT
        se.id AS session_exercise_id,
        ws.id AS workout_session_id,
        w.id AS workout_id,
        w.name AS workout_name,
        ws.finished_at AS performed_at,
        e.type AS exercise_type
      FROM session_exercises se

      JOIN workout_sessions ws
        ON ws.id = se.workout_session_id

      JOIN workouts w
        ON w.id = ws.workout_id

      JOIN exercises e
        ON e.id = se.exercise_id

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

  if (sessions.length === 0) {
    return []
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

      JOIN workout_sessions ws
        ON ws.id = se.workout_session_id

      WHERE se.exercise_id = ?
        AND se.is_skipped = 0
        AND ws.finished_at IS NOT NULL
        AND sr.reps IS NOT NULL

      ORDER BY sr.set_number ASC
    `,
    exerciseId,
  )

  const setsByOccurrence = new Map<string, ExerciseHistoryItem['sets']>()

  for (const row of setRows) {
    const sets = setsByOccurrence.get(row.session_exercise_id) ?? []

    sets.push({
      setNumber: row.set_number,
      weight: row.weight,
      reps: row.reps,
    })

    setsByOccurrence.set(row.session_exercise_id, sets)
  }

  const history = sessions.map((session) => ({
    sessionExerciseId: session.session_exercise_id,
    workoutSessionId: session.workout_session_id,
    workoutId: session.workout_id,
    workoutName: session.workout_name,
    performedAt: session.performed_at,
    sets: setsByOccurrence.get(session.session_exercise_id) ?? [],
    isPr: false,
  }))

  // Personal records are derived, never stored; computed over the full
  // history before the limit is applied.
  const annotated = annotateWithPersonalRecords(
    history,
    sessions[0].exercise_type,
  )

  return limit !== undefined ? annotated.slice(0, limit) : annotated
}

export function getRecentExerciseHistory(
  exerciseId: string,
  limit = 3,
): Promise<ExerciseHistoryItem[]> {
  return getExerciseHistoryInternal(exerciseId, limit)
}

export function getExerciseHistory(
  exerciseId: string,
): Promise<ExerciseHistoryItem[]> {
  return getExerciseHistoryInternal(exerciseId)
}


export async function getExerciseHistorySummary(
  exerciseId: string,
): Promise<ExerciseHistorySummary | null> {
  const db = await dbPromise

  const exercise = await db.getFirstAsync<{
    type: 'WEIGHTED' | 'BODYWEIGHT'
  }>(
    `
      SELECT type
      FROM exercises
      WHERE id = ?
    `,
    exerciseId,
  )

  if (!exercise) {
    return null
  }

  const countResult = await db.getFirstAsync<{
    session_count: number
  }>(
    `
      SELECT COUNT(*) AS session_count
      FROM session_exercises se

      JOIN workout_sessions ws
        ON ws.id = se.workout_session_id

      WHERE se.exercise_id = ?
        AND se.is_skipped = 0
        AND ws.finished_at IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM set_records sr
          WHERE sr.session_exercise_id = se.id
            AND sr.reps IS NOT NULL
        )
    `,
    exerciseId,
  )

  const sessionCount = countResult?.session_count ?? 0

  if (exercise.type === 'WEIGHTED') {
    const bestSet = await db.getFirstAsync<{
      weight: number
      reps: number
      volume: number
    }>(
      `
        SELECT
          sr.weight,
          sr.reps,
          sr.weight * sr.reps AS volume
        FROM set_records sr

        JOIN session_exercises se
          ON se.id = sr.session_exercise_id

        JOIN workout_sessions ws
          ON ws.id = se.workout_session_id

        WHERE se.exercise_id = ?
          AND se.is_skipped = 0
          AND ws.finished_at IS NOT NULL
          AND sr.weight IS NOT NULL
          AND sr.reps IS NOT NULL

        ORDER BY
          volume DESC,
          ws.finished_at DESC

        LIMIT 1
      `,
      exerciseId,
    )

    return {
      sessionCount,

      bestSet: bestSet
        ? {
          type: 'WEIGHTED',
          weight: bestSet.weight,
          reps: bestSet.reps,
          volume: bestSet.volume,
        }
        : null,
    }
  }

  const bestSet = await db.getFirstAsync<{
    reps: number
  }>(
    `
      SELECT
        sr.reps
      FROM set_records sr

      JOIN session_exercises se
        ON se.id = sr.session_exercise_id

      JOIN workout_sessions ws
        ON ws.id = se.workout_session_id

      WHERE se.exercise_id = ?
        AND se.is_skipped = 0
        AND ws.finished_at IS NOT NULL
        AND sr.reps IS NOT NULL

      ORDER BY
        sr.reps DESC,
        ws.finished_at DESC

      LIMIT 1
    `,
    exerciseId,
  )

  return {
    sessionCount,

    bestSet: bestSet
      ? {
        type: 'BODYWEIGHT',
        reps: bestSet.reps,
      }
      : null,
  }
}