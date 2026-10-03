import { dbPromise } from '@/db/database'
import type { ExerciseType, MuscleKey } from '@/types/entities'

/**
 * A read-only snapshot of everything the user owns.
 *
 * Rows are returned close to their stored shape rather than as domain objects:
 * export is about fidelity and future import, so ids and raw values are kept
 * and nothing is derived. Personal records and chart points are deliberately
 * absent — both are computed from sessions and sets at read time, so exporting
 * them would only create data that can go stale.
 */
export type ExportSnapshot = {
  exercises: ExportExercise[]
  workouts: ExportWorkout[]
  workoutExercises: ExportWorkoutExercise[]
  workoutExerciseAlternatives: ExportAlternative[]
  sessions: ExportSession[]
  sessionExercises: ExportSessionExercise[]
  setRecords: ExportSetRecord[]
}

export type ExportExercise = {
  id: string
  /** Stable identifier for a built-in exercise; null for custom ones. */
  sourceKey: string | null
  name: string
  type: ExerciseType
  isBuiltIn: boolean
  isArchived: boolean
  createdAt: string
  updatedAt: string | null
  primaryMuscle: MuscleKey | null
  secondaryMuscles: MuscleKey[]
}

export type ExportWorkout = {
  id: string
  name: string
  isArchived: boolean
  createdAt: string
  updatedAt: string
}

export type ExportWorkoutExercise = {
  id: string
  workoutId: string
  exerciseId: string
  position: number
  sets: number
  repMin: number | null
  repMax: number | null
}

export type ExportAlternative = {
  id: string
  workoutExerciseId: string
  exerciseId: string
  position: number
}

export type ExportSession = {
  id: string
  workoutId: string
  startedAt: string
  finishedAt: string | null
  pausedAt: string | null
  totalPausedMs: number
}

export type ExportSessionExercise = {
  id: string
  workoutSessionId: string
  /** What was actually performed. */
  exerciseId: string
  /** What the template planned; differs after a replacement. */
  plannedExerciseId: string | null
  position: number
  isSkipped: boolean
  plannedSets: number | null
  repMin: number | null
  repMax: number | null
}

export type ExportSetRecord = {
  id: string
  sessionExerciseId: string
  setNumber: number
  weight: number | null
  reps: number | null
}

/**
 * Reads the whole database in one transaction, so a session finishing or a set
 * being saved midway through cannot produce an export whose sets belong to a
 * session it does not contain. expo-sqlite runs these on a single connection,
 * and a transaction gives the reads a consistent view of the database.
 *
 * Eight full-table queries, fixed whatever the history size — never one query
 * per session or per exercise. Rows are assembled in memory afterwards.
 */
export async function readExportSnapshot(): Promise<ExportSnapshot> {
  const db = await dbPromise

  let snapshot: ExportSnapshot | null = null

  await db.withTransactionAsync(async () => {
    const exerciseRows = await db.getAllAsync<{
      id: string
      source_key: string | null
      name: string
      type: ExerciseType
      is_built_in: number
      is_archived: number
      created_at: string
      updated_at: string | null
    }>(`
      SELECT
        id,
        source_key,
        name,
        type,
        is_built_in,
        is_archived,
        created_at,
        updated_at
      FROM exercises
      ORDER BY name COLLATE NOCASE ASC
    `)

    // One pass for every exercise's muscles, joined to the muscle key rather
    // than the internal muscle row id, which means nothing to an importer.
    const muscleRows = await db.getAllAsync<{
      exercise_id: string
      muscle_key: MuscleKey
      role: 'PRIMARY' | 'SECONDARY'
    }>(`
      SELECT
        em.exercise_id,
        m.muscle_key,
        em.role
      FROM exercise_muscles em
      JOIN muscles m
        ON m.id = em.muscle_id
      ORDER BY m.muscle_key ASC
    `)

    const primaryByExercise = new Map<string, MuscleKey>()
    const secondaryByExercise = new Map<string, MuscleKey[]>()

    for (const row of muscleRows) {
      if (row.role === 'PRIMARY') {
        primaryByExercise.set(row.exercise_id, row.muscle_key)
      } else {
        const existing = secondaryByExercise.get(row.exercise_id) ?? []

        existing.push(row.muscle_key)
        secondaryByExercise.set(row.exercise_id, existing)
      }
    }

    // Archived workouts and exercises are included: history still references
    // them, so omitting them would export sessions pointing at nothing.
    const workoutRows = await db.getAllAsync<{
      id: string
      name: string
      is_archived: number
      created_at: string
      updated_at: string
    }>(`
      SELECT
        id,
        name,
        is_archived,
        created_at,
        updated_at
      FROM workouts
      ORDER BY created_at ASC
    `)

    const workoutExerciseRows = await db.getAllAsync<{
      id: string
      workout_id: string
      exercise_id: string
      position: number
      sets: number
      rep_min: number | null
      rep_max: number | null
    }>(`
      SELECT
        id,
        workout_id,
        exercise_id,
        position,
        sets,
        rep_min,
        rep_max
      FROM workout_exercises
      ORDER BY workout_id ASC, position ASC
    `)

    const alternativeRows = await db.getAllAsync<{
      id: string
      workout_exercise_id: string
      exercise_id: string
      position: number
    }>(`
      SELECT
        id,
        workout_exercise_id,
        exercise_id,
        position
      FROM workout_exercise_alternatives
      ORDER BY workout_exercise_id ASC, position ASC
    `)

    const sessionRows = await db.getAllAsync<{
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
      ORDER BY started_at ASC
    `)

    const sessionExerciseRows = await db.getAllAsync<{
      id: string
      workout_session_id: string
      exercise_id: string
      planned_exercise_id: string | null
      position: number
      is_skipped: number
      planned_sets: number | null
      rep_min: number | null
      rep_max: number | null
    }>(`
      SELECT
        id,
        workout_session_id,
        exercise_id,
        planned_exercise_id,
        position,
        is_skipped,
        planned_sets,
        rep_min,
        rep_max
      FROM session_exercises
      ORDER BY workout_session_id ASC, position ASC
    `)

    const setRows = await db.getAllAsync<{
      id: string
      session_exercise_id: string
      set_number: number
      weight: number | null
      reps: number | null
    }>(`
      SELECT
        id,
        session_exercise_id,
        set_number,
        weight,
        reps
      FROM set_records
      ORDER BY session_exercise_id ASC, set_number ASC
    `)

    snapshot = {
      exercises: exerciseRows.map((row) => ({
        id: row.id,
        sourceKey: row.source_key,
        name: row.name,
        type: row.type,
        isBuiltIn: row.is_built_in === 1,
        isArchived: row.is_archived === 1,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        primaryMuscle: primaryByExercise.get(row.id) ?? null,
        secondaryMuscles: secondaryByExercise.get(row.id) ?? [],
      })),

      workouts: workoutRows.map((row) => ({
        id: row.id,
        name: row.name,
        isArchived: row.is_archived === 1,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),

      workoutExercises: workoutExerciseRows.map((row) => ({
        id: row.id,
        workoutId: row.workout_id,
        exerciseId: row.exercise_id,
        position: row.position,
        sets: row.sets,
        repMin: row.rep_min,
        repMax: row.rep_max,
      })),

      workoutExerciseAlternatives: alternativeRows.map((row) => ({
        id: row.id,
        workoutExerciseId: row.workout_exercise_id,
        exerciseId: row.exercise_id,
        position: row.position,
      })),

      sessions: sessionRows.map((row) => ({
        id: row.id,
        workoutId: row.workout_id,
        startedAt: row.started_at,
        finishedAt: row.finished_at,
        pausedAt: row.paused_at,
        totalPausedMs: row.total_paused_duration,
      })),

      sessionExercises: sessionExerciseRows.map((row) => ({
        id: row.id,
        workoutSessionId: row.workout_session_id,
        exerciseId: row.exercise_id,
        plannedExerciseId: row.planned_exercise_id,
        position: row.position,
        isSkipped: row.is_skipped === 1,
        plannedSets: row.planned_sets,
        repMin: row.rep_min,
        repMax: row.rep_max,
      })),

      setRecords: setRows.map((row) => ({
        id: row.id,
        sessionExerciseId: row.session_exercise_id,
        setNumber: row.set_number,
        weight: row.weight,
        reps: row.reps,
      })),
    }
  })

  if (!snapshot) {
    throw new Error('Could not read your data for export.')
  }

  return snapshot
}
