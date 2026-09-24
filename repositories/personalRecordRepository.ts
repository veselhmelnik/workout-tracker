import { dbPromise } from '@/db/database'
import type { ExerciseType } from '@/types/entities'
import { annotateWithPersonalRecords } from '@/utils/personalRecords'

type OccurrenceRow = {
  session_exercise_id: string
  workout_session_id: string
  exercise_id: string
  exercise_type: ExerciseType
  performed_at: string
}

type SetRow = {
  session_exercise_id: string
  set_number: number
  weight: number | null
  reps: number | null
}

export type PersonalRecordOccurrence = {
  sessionExerciseId: string
  workoutSessionId: string
  exerciseId: string
}

/**
 * Every occurrence that set a personal record, for the given exercises (or for
 * all exercises when no ids are passed).
 *
 * Two queries regardless of how many exercises or sessions are involved: the
 * occurrences, then their sets. Grouping and the chronological walk happen in
 * TypeScript through the shared helper, so the PR rule lives in exactly one
 * place and matches Exercise Details and Full Exercise History exactly.
 *
 * Archive state is deliberately not filtered — history stays intact after an
 * exercise or workout is archived.
 */
export async function getPersonalRecordOccurrences(
  exerciseIds?: string[],
): Promise<PersonalRecordOccurrence[]> {
  if (exerciseIds && exerciseIds.length === 0) {
    return []
  }

  const db = await dbPromise

  // Same validity rules as the rest of history: finished sessions, exercises
  // that were not skipped, and sets that actually recorded reps.
  const exerciseFilter = exerciseIds
    ? `AND se.exercise_id IN (${exerciseIds.map(() => '?').join(', ')})`
    : ''

  const parameters = exerciseIds ?? []

  const occurrenceRows = await db.getAllAsync<OccurrenceRow>(
    `
      SELECT
        se.id AS session_exercise_id,
        se.workout_session_id,
        se.exercise_id,
        e.type AS exercise_type,
        ws.finished_at AS performed_at

      FROM session_exercises se

      JOIN workout_sessions ws
        ON ws.id = se.workout_session_id

      JOIN exercises e
        ON e.id = se.exercise_id

      WHERE se.is_skipped = 0
        AND ws.finished_at IS NOT NULL
        ${exerciseFilter}

      ORDER BY ws.finished_at ASC;
    `,
    ...parameters,
  )

  if (occurrenceRows.length === 0) {
    return []
  }

  const setRows = await db.getAllAsync<SetRow>(
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

      WHERE se.is_skipped = 0
        AND ws.finished_at IS NOT NULL
        AND sr.reps IS NOT NULL
        ${exerciseFilter}

      ORDER BY sr.set_number ASC;
    `,
    ...parameters,
  )

  const setsByOccurrence = new Map<string, SetRow[]>()

  for (const row of setRows) {
    const sets = setsByOccurrence.get(row.session_exercise_id) ?? []

    sets.push(row)
    setsByOccurrence.set(row.session_exercise_id, sets)
  }

  type Group = {
    type: ExerciseType
    occurrences: {
      sessionExerciseId: string
      workoutSessionId: string
      exerciseId: string
      performedAt: string
      sets: { setNumber: number; weight: number | null; reps: number | null }[]
    }[]
  }

  const groups = new Map<string, Group>()

  for (const row of occurrenceRows) {
    const group = groups.get(row.exercise_id) ?? {
      type: row.exercise_type,
      occurrences: [],
    }

    group.occurrences.push({
      sessionExerciseId: row.session_exercise_id,
      workoutSessionId: row.workout_session_id,
      exerciseId: row.exercise_id,
      performedAt: row.performed_at,
      sets: (setsByOccurrence.get(row.session_exercise_id) ?? []).map(
        (set) => ({
          setNumber: set.set_number,
          weight: set.weight,
          reps: set.reps,
        }),
      ),
    })

    groups.set(row.exercise_id, group)
  }

  const records: PersonalRecordOccurrence[] = []

  for (const group of groups.values()) {
    for (const occurrence of annotateWithPersonalRecords(
      group.occurrences,
      group.type,
    )) {
      if (occurrence.isPr) {
        records.push({
          sessionExerciseId: occurrence.sessionExerciseId,
          workoutSessionId: occurrence.workoutSessionId,
          exerciseId: occurrence.exerciseId,
        })
      }
    }
  }

  return records
}

/** Personal-record occurrence ids for the given exercises, for quick lookup. */
export async function getPersonalRecordIds(
  exerciseIds?: string[],
): Promise<Set<string>> {
  const records = await getPersonalRecordOccurrences(exerciseIds)

  return new Set(records.map((record) => record.sessionExerciseId))
}

/** How many exercise results in each session set a personal record. */
export async function getPersonalRecordCountsBySession(): Promise<
  Map<string, number>
> {
  const records = await getPersonalRecordOccurrences()
  const counts = new Map<string, number>()

  for (const record of records) {
    counts.set(
      record.workoutSessionId,
      (counts.get(record.workoutSessionId) ?? 0) + 1,
    )
  }

  return counts
}
