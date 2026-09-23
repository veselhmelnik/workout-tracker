import { dbPromise } from '@/db/database'
import type { WorkoutSession } from '@/types/entities'
import * as Crypto from 'expo-crypto'

export type WorkoutSessionDetails = WorkoutSession & {
    exercises: {
        id: string
        exerciseId: string
        name: string
        type: 'WEIGHTED' | 'BODYWEIGHT'
        position: number
        isSkipped: boolean

        repMin: number | null
        repMax: number | null

        sets: {
            id: string
            setNumber: number
            weight: number | null
            reps: number | null
        }[]
    }[]
}

type UpdateSetRecordInput = {
    weight: number | null
    reps: number | null
}

export async function startWorkout(
    workoutId: string,
): Promise<WorkoutSession> {
    const db = await dbPromise

    const activeSession = await getActiveWorkoutSession()

    if (activeSession) {
        throw new Error('A workout is already in progress')
    }

    const workoutExercises = await db.getAllAsync<{
        exercise_id: string
        sets: number
        rep_min: number | null
        rep_max: number | null
        position: number
    }>(
        `
      SELECT
        exercise_id,
        sets,
        rep_min,
        rep_max,
        position
      FROM workout_exercises
      WHERE workout_id = ?
      ORDER BY position ASC
    `,
        workoutId,
    )

    const session: WorkoutSession = {
        id: Crypto.randomUUID(),
        workoutId,
        startedAt: new Date().toISOString(),
        finishedAt: null,
        pausedAt: null,
        totalPausedDuration: 0,
    }

    await db.withTransactionAsync(async () => {
        await db.runAsync(
            `
        INSERT INTO workout_sessions (
          id,
          workout_id,
          started_at,
          finished_at,
          paused_at,
          total_paused_duration
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `,
            session.id,
            session.workoutId,
            session.startedAt,
            session.finishedAt,
            session.pausedAt,
            session.totalPausedDuration,
        )

        for (const workoutExercise of workoutExercises) {
            const sessionExerciseId = Crypto.randomUUID()

            await db.runAsync(
                `
                    INSERT INTO session_exercises (
                    id,
                    workout_session_id,
                    exercise_id,
                    position,
                    is_skipped,
                    planned_sets,
                    rep_min,
                    rep_max
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `,
                sessionExerciseId,
                session.id,
                workoutExercise.exercise_id,
                workoutExercise.position,
                0,
                workoutExercise.sets,
                workoutExercise.rep_min,
                workoutExercise.rep_max,
            )

            const previousWeights = await getPreviousSetWeights(
                workoutExercise.exercise_id,
            )

            for (
                let setNumber = 1;
                setNumber <= workoutExercise.sets;
                setNumber++
            ) {
                const previousWeight =
                    previousWeights.get(setNumber) ?? null

                await db.runAsync(
                    `
            INSERT INTO set_records (
              id,
              session_exercise_id,
              set_number,
              weight,
              reps
            )
            VALUES (?, ?, ?, ?, ?)
          `,
                    Crypto.randomUUID(),
                    sessionExerciseId,
                    setNumber,
                    previousWeight,
                    null,
                )
            }
        }
    })

    return session
}

export async function getWorkoutSessionById(
    id: string,
): Promise<WorkoutSession | null> {
    const db = await dbPromise

    const row = await db.getFirstAsync<{
        id: string
        workout_id: string
        started_at: string
        finished_at: string | null
        paused_at: string | null
        total_paused_duration: number
    }>(
        `
      SELECT
        id,
        workout_id,
        started_at,
        finished_at,
        paused_at,
        total_paused_duration
      FROM workout_sessions
      WHERE id = ?
    `,
        id,
    )

    if (!row) {
        return null
    }

    return {
        id: row.id,
        workoutId: row.workout_id,
        startedAt: row.started_at,
        finishedAt: row.finished_at,
        pausedAt: row.paused_at,
        totalPausedDuration: row.total_paused_duration,
    }
}

export async function getWorkoutSessionDetails(
    id: string,
): Promise<WorkoutSessionDetails | null> {
    const db = await dbPromise

    const session = await db.getFirstAsync<{
        id: string
        workout_id: string
        started_at: string
        finished_at: string | null
        paused_at: string | null
        total_paused_duration: number
    }>(
        `
      SELECT
        id,
        workout_id,
        started_at,
        finished_at,
        paused_at,
        total_paused_duration
      FROM workout_sessions
      WHERE id = ?
    `,
        id,
    )

    if (!session) {
        return null
    }

    const exerciseRows = await db.getAllAsync<{
        session_exercise_id: string
        exercise_id: string
        name: string
        type: 'WEIGHTED' | 'BODYWEIGHT'
        position: number
        is_skipped: number
        rep_min: number | null
        rep_max: number | null
    }>(
        `
      SELECT
        se.id AS session_exercise_id,
        se.exercise_id,
        e.name,
        e.type,
        se.position,
        se.is_skipped,
        se.rep_min,
        se.rep_max
      FROM session_exercises se
      JOIN exercises e
        ON e.id = se.exercise_id
      WHERE se.workout_session_id = ?
      ORDER BY se.position ASC
    `,
        id,
    )

    const exercises: WorkoutSessionDetails['exercises'] = []

    for (const exerciseRow of exerciseRows) {
        const setRows = await db.getAllAsync<{
            id: string
            set_number: number
            weight: number | null
            reps: number | null
        }>(
            `
        SELECT
          id,
          set_number,
          weight,
          reps
        FROM set_records
        WHERE session_exercise_id = ?
        ORDER BY set_number ASC
      `,
            exerciseRow.session_exercise_id,
        )

        exercises.push({
            id: exerciseRow.session_exercise_id,
            exerciseId: exerciseRow.exercise_id,
            name: exerciseRow.name,
            type: exerciseRow.type,
            position: exerciseRow.position,
            isSkipped: exerciseRow.is_skipped === 1,
            repMin: exerciseRow.rep_min,
            repMax: exerciseRow.rep_max,

            sets: setRows.map((set) => ({
                id: set.id,
                setNumber: set.set_number,
                weight: set.weight,
                reps: set.reps,
            })),
        })
    }

    return {
        id: session.id,
        workoutId: session.workout_id,
        startedAt: session.started_at,
        finishedAt: session.finished_at,
        pausedAt: session.paused_at,
        totalPausedDuration: session.total_paused_duration,
        exercises,
    }
}

export async function updateSetRecord(
    setId: string,
    input: UpdateSetRecordInput,
): Promise<void> {
    const db = await dbPromise

    await db.runAsync(
        `
      UPDATE set_records
      SET
        weight = ?,
        reps = ?
      WHERE id = ?
    `,
        input.weight,
        input.reps,
        setId,
    )
}

export async function skipExercise(
    sessionExerciseId: string,
): Promise<void> {
    const db = await dbPromise

    await db.runAsync(
        `
      UPDATE session_exercises
      SET is_skipped = 1
      WHERE id = ?
    `,
        sessionExerciseId,
    )
}

export async function restoreExercise(
    sessionExerciseId: string,
): Promise<void> {
    const db = await dbPromise

    await db.runAsync(
        `
      UPDATE session_exercises
      SET is_skipped = 0
      WHERE id = ?
    `,
        sessionExerciseId,
    )
}

export async function addSet(
    sessionExerciseId: string,
): Promise<void> {
    const db = await dbPromise

    const row = await db.getFirstAsync<{
        max_set_number: number | null
    }>(
        `
      SELECT MAX(set_number) AS max_set_number
      FROM set_records
      WHERE session_exercise_id = ?
    `,
        sessionExerciseId,
    )

    const nextSetNumber = (row?.max_set_number ?? 0) + 1

    await db.runAsync(
        `
      INSERT INTO set_records (
        id,
        session_exercise_id,
        set_number,
        weight,
        reps
      )
      VALUES (?, ?, ?, ?, ?)
    `,
        Crypto.randomUUID(),
        sessionExerciseId,
        nextSetNumber,
        null,
        null,
    )
}

export async function removeSet(
    setId: string,
): Promise<void> {
    const db = await dbPromise

    await db.withTransactionAsync(async () => {
        const set = await db.getFirstAsync<{
            session_exercise_id: string
            set_number: number
        }>(
            `
        SELECT
          session_exercise_id,
          set_number
        FROM set_records
        WHERE id = ?
      `,
            setId,
        )

        if (!set) {
            throw new Error('Set not found')
        }

        await db.runAsync(
            `
        DELETE FROM set_records
        WHERE id = ?
      `,
            setId,
        )

        await db.runAsync(
            `
        UPDATE set_records
        SET set_number = set_number - 1
        WHERE session_exercise_id = ?
          AND set_number > ?
      `,
            set.session_exercise_id,
            set.set_number,
        )
    })
}

export async function pauseWorkout(
    sessionId: string,
): Promise<void> {
    const db = await dbPromise

    const session = await getWorkoutSessionById(sessionId)

    if (!session) {
        throw new Error('Workout session not found')
    }

    if (session.finishedAt) {
        throw new Error('Workout session is already finished')
    }

    if (session.pausedAt) {
        return
    }

    await db.runAsync(
        `
      UPDATE workout_sessions
      SET paused_at = ?
      WHERE id = ?
    `,
        new Date().toISOString(),
        sessionId,
    )
}

export async function resumeWorkout(
    sessionId: string,
): Promise<void> {
    const db = await dbPromise

    const session = await getWorkoutSessionById(sessionId)

    if (!session) {
        throw new Error('Workout session not found')
    }

    if (session.finishedAt) {
        throw new Error('Workout session is already finished')
    }

    if (!session.pausedAt) {
        return
    }

    const pauseStartedAt = new Date(session.pausedAt).getTime()
    const resumedAt = Date.now()

    const pauseDuration = resumedAt - pauseStartedAt

    await db.runAsync(
        `
      UPDATE workout_sessions
      SET
        paused_at = NULL,
        total_paused_duration = total_paused_duration + ?
      WHERE id = ?
    `,
        pauseDuration,
        sessionId,
    )
}

export async function finishWorkout(
    sessionId: string,
): Promise<void> {
    const db = await dbPromise

    const session = await getWorkoutSessionById(sessionId)

    if (!session) {
        throw new Error('Workout session not found')
    }

    if (session.finishedAt) {
        return
    }

    let totalPausedDuration = session.totalPausedDuration

    if (session.pausedAt) {
        totalPausedDuration +=
            Date.now() - new Date(session.pausedAt).getTime()
    }

    const finishedAt = new Date().toISOString()

    await db.withTransactionAsync(async () => {
        await db.runAsync(
            `
        UPDATE session_exercises
        SET is_skipped = 1
        WHERE workout_session_id = ?
          AND is_skipped = 0
          AND NOT EXISTS (
            SELECT 1
            FROM set_records sr
            WHERE sr.session_exercise_id = session_exercises.id
              AND sr.reps IS NOT NULL
          )
      `,
            sessionId,
        )

        await db.runAsync(
            `
        UPDATE workout_sessions
        SET
          finished_at = ?,
          paused_at = NULL,
          total_paused_duration = ?
        WHERE id = ?
      `,
            finishedAt,
            totalPausedDuration,
            sessionId,
        )
    })
}

export async function getActiveWorkoutSession(): Promise<WorkoutSession | null> {
    const db = await dbPromise

    const row = await db.getFirstAsync<{
        id: string
        workout_id: string
        started_at: string
        finished_at: string | null
        paused_at: string | null
        total_paused_duration: number
    }>(`
    SELECT
      id,
      workout_id,
      started_at,
      finished_at,
      paused_at,
      total_paused_duration
    FROM workout_sessions
    WHERE finished_at IS NULL
    ORDER BY started_at DESC
    LIMIT 1
  `)

    if (!row) {
        return null
    }

    return {
        id: row.id,
        workoutId: row.workout_id,
        startedAt: row.started_at,
        finishedAt: row.finished_at,
        pausedAt: row.paused_at,
        totalPausedDuration: row.total_paused_duration,
    }
}

async function getPreviousSetWeights(
    exerciseId: string,
): Promise<Map<number, number | null>> {
    const db = await dbPromise

    const previousSessionExercise = await db.getFirstAsync<{
        id: string
    }>(
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

    if (!previousSessionExercise) {
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
        previousSessionExercise.id,
    )

    return new Map(
        rows.map((row) => [
            row.set_number,
            row.weight,
        ]),
    )
}