import { dbPromise } from '@/db/database'
import * as Crypto from 'expo-crypto'

type Database = Awaited<typeof dbPromise>

export type TemplateExerciseSnapshot = {
  exerciseId: string
  sets: number
  repMin: number | null
  repMax: number | null
}

type SessionExerciseRow = {
  id: string
  /** The slot this occurrence came from, even after a replacement. */
  slot_exercise_id: string
  position: number
  set_count: number
  recorded_count: number
}

/**
 * Positions are unique per session, so existing rows are parked above any
 * value the new layout can use before being renumbered.
 */
const POSITION_OFFSET = 10_000

/**
 * Brings the unfinished session of a workout in line with the template that
 * was just saved. Occurrences are matched on slot identity — the planned
 * exercise — not on what is actually being performed, so a replaced exercise
 * keeps its slot instead of looking like "template exercise missing, unknown
 * exercise added".
 *
 * - new in the template: snapshotted into the session with its sets prefilled
 * - dropped from the template: removed only when nothing was recorded, kept
 *   (after the template exercises) when it already holds reps
 * - present in both: position and planned sets/reps updated, recorded values
 *   and the performed exercise_id never touched
 *
 * Must run inside a transaction opened by the caller, so saving the template
 * and syncing the session commit or roll back together.
 */
export async function syncActiveSessionWithinTransaction(
  db: Database,
  workoutId: string,
  templateExercises: TemplateExerciseSnapshot[],
): Promise<void> {
  const session = await db.getFirstAsync<{ id: string }>(
    `
      SELECT id
      FROM workout_sessions
      WHERE workout_id = ?
        AND finished_at IS NULL
      ORDER BY started_at DESC
      LIMIT 1
    `,
    workoutId,
  )

  if (!session) {
    return
  }

  const sessionExercises = await db.getAllAsync<SessionExerciseRow>(
    `
      SELECT
        se.id,

        -- Slot identity, never the performed exercise: a replaced occurrence
        -- must still match the template slot it belongs to. COALESCE covers
        -- pre-008 rows that predate the backfill.
        COALESCE(se.planned_exercise_id, se.exercise_id) AS slot_exercise_id,

        se.position,

        (
          SELECT COUNT(*)
          FROM set_records sr
          WHERE sr.session_exercise_id = se.id
        ) AS set_count,

        (
          SELECT COUNT(*)
          FROM set_records sr
          WHERE sr.session_exercise_id = se.id
            AND sr.reps IS NOT NULL
        ) AS recorded_count

      FROM session_exercises se
      WHERE se.workout_session_id = ?
      ORDER BY se.position ASC
    `,
    session.id,
  )

  // Park current positions so renumbering cannot collide with the unique
  // (workout_session_id, position) index while rows are being moved.
  await db.runAsync(
    `
      UPDATE session_exercises
      SET position = position + ?
      WHERE workout_session_id = ?
    `,
    POSITION_OFFSET,
    session.id,
  )

  const bySlotExerciseId = new Map(
    sessionExercises.map((row) => [row.slot_exercise_id, row]),
  )

  for (const [index, template] of templateExercises.entries()) {
    const existing = bySlotExerciseId.get(template.exerciseId)

    if (existing) {
      await db.runAsync(
        `
          UPDATE session_exercises
          SET
            position = ?,
            planned_sets = ?,
            rep_min = ?,
            rep_max = ?
          WHERE id = ?
        `,
        index,
        template.sets,
        template.repMin,
        template.repMax,
        existing.id,
      )

      if (template.sets > existing.set_count) {
        await addMissingSets(
          db,
          existing.id,
          template.exerciseId,
          existing.set_count,
          template.sets,
        )
      } else if (template.sets < existing.set_count) {
        // Only trailing empties go; anything with reps stays.
        await db.runAsync(
          `
            DELETE FROM set_records
            WHERE session_exercise_id = ?
              AND set_number > ?
              AND reps IS NULL
          `,
          existing.id,
          template.sets,
        )
      }

      continue
    }

    const sessionExerciseId = Crypto.randomUUID()

    await db.runAsync(
      `
        INSERT INTO session_exercises (
          id,
          workout_session_id,
          exercise_id,
          planned_exercise_id,
          position,
          is_skipped,
          planned_sets,
          rep_min,
          rep_max
        )
        VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)
      `,
      sessionExerciseId,
      session.id,
      template.exerciseId,
      // A slot added mid-session starts unreplaced.
      template.exerciseId,
      index,
      template.sets,
      template.repMin,
      template.repMax,
    )

    await addMissingSets(
      db,
      sessionExerciseId,
      template.exerciseId,
      0,
      template.sets,
    )
  }

  const templateIds = new Set(
    templateExercises.map((template) => template.exerciseId),
  )

  const dropped = sessionExercises.filter(
    (row) => !templateIds.has(row.slot_exercise_id),
  )

  let retainedPosition = templateExercises.length

  for (const row of dropped) {
    if (row.recorded_count > 0) {
      // Recorded training data is never deleted; it keeps a deterministic
      // place after the current template exercises.
      await db.runAsync(
        `
          UPDATE session_exercises
          SET position = ?
          WHERE id = ?
        `,
        retainedPosition,
        row.id,
      )

      retainedPosition += 1

      continue
    }

    // Nothing was recorded, so the row can go; set_records cascade with it.
    await db.runAsync(
      `
        DELETE FROM session_exercises
        WHERE id = ?
      `,
      row.id,
    )
  }
}

/** Appends empty sets, prefilling weight from the last completed session. */
async function addMissingSets(
  db: Database,
  sessionExerciseId: string,
  exerciseId: string,
  currentSetCount: number,
  targetSetCount: number,
): Promise<void> {
  const previousWeights = await getPreviousSetWeightsWithinTransaction(
    db,
    exerciseId,
  )

  for (
    let setNumber = currentSetCount + 1;
    setNumber <= targetSetCount;
    setNumber++
  ) {
    await db.runAsync(
      `
        INSERT INTO set_records (
          id,
          session_exercise_id,
          set_number,
          weight,
          reps
        )
        VALUES (?, ?, ?, ?, NULL)
      `,
      Crypto.randomUUID(),
      sessionExerciseId,
      setNumber,
      previousWeights.get(setNumber) ?? null,
    )
  }
}

/** Same prefill rule startWorkout uses, reusable inside a transaction. */
export async function getPreviousSetWeightsWithinTransaction(
  db: Database,
  exerciseId: string,
): Promise<Map<number, number | null>> {
  const previous = await db.getFirstAsync<{ id: string }>(
    `
      SELECT se.id
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

      ORDER BY ws.finished_at DESC
      LIMIT 1
    `,
    exerciseId,
  )

  if (!previous) {
    return new Map()
  }

  const rows = await db.getAllAsync<{
    set_number: number
    weight: number | null
  }>(
    `
      SELECT
        set_number,
        weight
      FROM set_records
      WHERE session_exercise_id = ?
      ORDER BY set_number ASC
    `,
    previous.id,
  )

  return new Map(rows.map((row) => [row.set_number, row.weight]))
}
