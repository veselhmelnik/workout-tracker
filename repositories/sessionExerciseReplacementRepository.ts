import { dbPromise } from '@/db/database'
import type { Exercise, ExerciseType } from '@/types/entities'
import { getPreviousSetWeightsWithinTransaction } from './activeSessionSync'
import * as Crypto from 'expo-crypto'

type Database = Awaited<typeof dbPromise>

/**
 * Swapping the exercise rebuilds the slot's sets, so a slot that already holds
 * reps can only be changed when the caller has asked the user and passes the
 * discard through explicitly.
 */
export type ExerciseChangeOptions = {
  discardRecordedSets?: boolean
}

/** Raised when reps exist and the caller has not authorized discarding them. */
export class RecordedSetsError extends Error {}

type SlotRow = {
  id: string
  workout_session_id: string
  workout_id: string
  exercise_id: string
  planned_exercise_id: string | null
  is_skipped: number
  planned_sets: number | null
  set_count: number
  recorded_count: number
}

/**
 * Replaces what is being performed in one slot of the active session. The
 * template is never touched: only session_exercises.exercise_id moves, while
 * planned_exercise_id keeps pointing at what the workout planned, so the next
 * session of this workout starts from the planned exercise again.
 */
export async function replaceActiveSessionExercise(
  sessionExerciseId: string,
  replacementExerciseId: string,
  options: ExerciseChangeOptions = {},
): Promise<void> {
  const db = await dbPromise

  await db.withTransactionAsync(async () => {
    const slot = await loadSlot(db, sessionExerciseId)

    // Nothing to do, and nothing worth destroying sets over.
    if (slot.exercise_id === replacementExerciseId) {
      return
    }

    const planned = slot.planned_exercise_id ?? slot.exercise_id

    if (replacementExerciseId === planned) {
      throw new Error(
        'That is the exercise this workout planned. Restore it instead.',
      )
    }

    const replacement = await loadExercise(db, replacementExerciseId)

    if (replacement.is_archived === 1) {
      throw new Error('That exercise is archived and cannot be selected.')
    }

    await assertNotAlreadyPerformed(
      db,
      slot.workout_session_id,
      sessionExerciseId,
      replacementExerciseId,
    )

    assertDiscardAuthorized(slot, options)

    await applyExerciseChange(db, slot, replacementExerciseId)
  })
}

/**
 * Puts the slot back on the exercise the workout planned. planned_exercise_id
 * is the source of truth throughout and is never written here, so restore is
 * always available however many times the exercise has been swapped.
 */
export async function restorePlannedSessionExercise(
  sessionExerciseId: string,
  options: ExerciseChangeOptions = {},
): Promise<void> {
  const db = await dbPromise

  await db.withTransactionAsync(async () => {
    const slot = await loadSlot(db, sessionExerciseId)

    const planned = slot.planned_exercise_id ?? slot.exercise_id

    if (slot.exercise_id === planned) {
      return
    }

    // The planned exercise is deliberately not archive-checked: a slot must
    // always be able to return to what the workout planned.
    await loadExercise(db, planned)

    await assertNotAlreadyPerformed(
      db,
      slot.workout_session_id,
      sessionExerciseId,
      planned,
    )

    assertDiscardAuthorized(slot, options)

    await applyExerciseChange(db, slot, planned)
  })
}

/**
 * The alternatives configured for the slot this occurrence came from.
 *
 * session_exercises stores no workout_exercise_id, so the slot is resolved
 * through the session's workout and the planned exercise. workout_exercises
 * is UNIQUE (workout_id, exercise_id), so that pair identifies exactly one
 * slot. Archived exercises are excluded: they cannot be newly selected.
 */
export async function getSessionExerciseAlternatives(
  sessionExerciseId: string,
): Promise<Exercise[]> {
  const db = await dbPromise

  const rows = await db.getAllAsync<{
    id: string
    name: string
    type: ExerciseType
    is_built_in: number
    is_archived: number
    source_key: string | null
    created_at: string
    updated_at: string | null
  }>(
    `
      SELECT
        e.id,
        e.name,
        e.type,
        e.is_built_in,
        e.is_archived,
        e.source_key,
        e.created_at,
        e.updated_at

      FROM session_exercises se

      JOIN workout_sessions ws
        ON ws.id = se.workout_session_id

      JOIN workout_exercises we
        ON we.workout_id = ws.workout_id
       AND we.exercise_id = COALESCE(se.planned_exercise_id, se.exercise_id)

      JOIN workout_exercise_alternatives a
        ON a.workout_exercise_id = we.id

      JOIN exercises e
        ON e.id = a.exercise_id

      WHERE se.id = ?
        AND e.is_archived = 0

      ORDER BY a.position ASC
    `,
    sessionExerciseId,
  )

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    isBuiltIn: Boolean(row.is_built_in),
    isArchived: Boolean(row.is_archived),
    sourceKey: row.source_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  }))
}

/**
 * Deletes the slot's sets and rebuilds them empty for the new exercise. Only
 * exercise_id and is_skipped change on the row itself — planned_exercise_id,
 * position, planned_sets and the rep range all belong to the slot, not to the
 * exercise performed in it.
 */
async function applyExerciseChange(
  db: Database,
  slot: SlotRow,
  exerciseId: string,
): Promise<void> {
  await db.runAsync(
    `
      DELETE FROM set_records
      WHERE session_exercise_id = ?
    `,
    slot.id,
  )

  await db.runAsync(
    `
      UPDATE session_exercises
      SET
        exercise_id = ?,
        -- Choosing an exercise for this slot is intent to train it, so a
        -- slot skipped earlier comes back rather than hiding the new choice.
        is_skipped = 0
      WHERE id = ?
    `,
    exerciseId,
    slot.id,
  )

  // planned_sets is nullable for sessions predating migration 007; the sets
  // the slot already had are the best available answer for those.
  const targetSetCount = slot.planned_sets ?? slot.set_count ?? 0

  const previousWeights = await getPreviousSetWeightsWithinTransaction(
    db,
    exerciseId,
  )

  for (let setNumber = 1; setNumber <= targetSetCount; setNumber++) {
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
      slot.id,
      setNumber,
      previousWeights.get(setNumber) ?? null,
    )
  }
}

async function loadSlot(
  db: Database,
  sessionExerciseId: string,
): Promise<SlotRow> {
  const slot = await db.getFirstAsync<SlotRow>(
    `
      SELECT
        se.id,
        se.workout_session_id,
        ws.workout_id,
        se.exercise_id,
        se.planned_exercise_id,
        se.is_skipped,
        se.planned_sets,

        (
          SELECT COUNT(*)
          FROM set_records sr
          WHERE sr.session_exercise_id = se.id
        ) AS set_count,

        -- reps, not weight: a prefilled weight alone is not performed work.
        (
          SELECT COUNT(*)
          FROM set_records sr
          WHERE sr.session_exercise_id = se.id
            AND sr.reps IS NOT NULL
        ) AS recorded_count

      FROM session_exercises se

      JOIN workout_sessions ws
        ON ws.id = se.workout_session_id

      WHERE se.id = ?
        AND ws.finished_at IS NULL
    `,
    sessionExerciseId,
  )

  if (!slot) {
    // Either it never existed or its session is finished; a finished session
    // is history and is never rewritten here.
    throw new Error('This exercise is not part of an active workout.')
  }

  return slot
}

async function loadExercise(
  db: Database,
  exerciseId: string,
): Promise<{ id: string; name: string; is_archived: number }> {
  const exercise = await db.getFirstAsync<{
    id: string
    name: string
    is_archived: number
  }>(
    `
      SELECT
        id,
        name,
        is_archived
      FROM exercises
      WHERE id = ?
    `,
    exerciseId,
  )

  if (!exercise) {
    throw new Error('That exercise no longer exists.')
  }

  return exercise
}

/**
 * One exercise may be the performed exercise of one slot per session, so a
 * replacement can never collide with work recorded elsewhere in the session.
 */
async function assertNotAlreadyPerformed(
  db: Database,
  workoutSessionId: string,
  sessionExerciseId: string,
  exerciseId: string,
): Promise<void> {
  const conflict = await db.getFirstAsync<{ id: string }>(
    `
      SELECT id
      FROM session_exercises
      WHERE workout_session_id = ?
        AND id != ?
        AND exercise_id = ?
      LIMIT 1
    `,
    workoutSessionId,
    sessionExerciseId,
    exerciseId,
  )

  if (conflict) {
    throw new Error('That exercise is already part of this workout.')
  }
}

function assertDiscardAuthorized(
  slot: SlotRow,
  options: ExerciseChangeOptions,
): void {
  if (slot.recorded_count > 0 && !options.discardRecordedSets) {
    throw new RecordedSetsError(
      'This exercise already has recorded sets. Changing it would discard them.',
    )
  }
}
