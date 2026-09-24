import type {
  WorkoutSessionHistoryDetails,
  WorkoutSessionHistoryExercise,
} from '@/repositories/workoutSessionHistoryRepository'

type SessionTiming = {
  startedAt: string
  finishedAt: string
  /** Milliseconds, accumulated by resume/finish from Date.now() differences. */
  totalPausedDuration: number
}

/** Training time excluding pauses; never negative, even for malformed rows. */
export function getSessionDurationMs(session: SessionTiming): number {
  const elapsed =
    new Date(session.finishedAt).getTime() -
    new Date(session.startedAt).getTime() -
    session.totalPausedDuration

  return Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0
}

export function getSessionMinutes(session: SessionTiming): number {
  return Math.round(getSessionDurationMs(session) / 60_000)
}

/** "6 exercises" when complete, "3 / 5 exercises" when the session fell short. */
export function formatExerciseProgress(performed: number, planned: number): string {
  const noun = planned === 1 ? 'exercise' : 'exercises'

  return performed === planned
    ? `${performed} ${noun}`
    : `${performed} / ${planned} ${noun}`
}

export function formatSetCount(count: number): string {
  return `${count} ${count === 1 ? 'set' : 'sets'}`
}

/** Local year-month, so a late-evening session groups with its own month. */
export function getMonthKey(isoDate: string): string {
  const date = new Date(isoDate)

  return `${date.getFullYear()}-${date.getMonth()}`
}

/** "SEPTEMBER", or "SEPTEMBER 2025" outside the current year; device locale. */
export function formatMonthHeading(isoDate: string): string {
  const date = new Date(isoDate)
  const isCurrentYear = date.getFullYear() === new Date().getFullYear()

  return date
    .toLocaleDateString(
      undefined,
      isCurrentYear ? { month: 'long' } : { month: 'long', year: 'numeric' },
    )
    .toLocaleUpperCase()
}

/** "18 Sep · 14:02 – 14:54" in the device's date order and clock format. */
export function formatSessionTimeRange(session: SessionTiming): string {
  const start = new Date(session.startedAt)
  const end = new Date(session.finishedAt)

  const time = (date: Date) =>
    date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })

  const day = start.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  })

  return `${day} · ${time(start)} – ${time(end)}`
}

// ---------------------------------------------------------------------------
// Session Details

export function isExercisePerformed(
  exercise: WorkoutSessionHistoryExercise,
): boolean {
  return !exercise.isSkipped && exercise.sets.length > 0
}

/**
 * The exercise this slot originally planned, when the session ended up
 * performing something else in it. Null for a normal result, so callers can
 * treat "no replacement" and "planned exercise unknown" (pre-008 sessions,
 * where planned_exercise_id is null) identically.
 *
 * Derived from the two ids on every read; nothing stores a replacement flag.
 */
export function getReplacedExerciseName(
  exercise: WorkoutSessionHistoryExercise,
): string | null {
  const planned = exercise.plannedExercise

  if (!planned || planned.id === exercise.exerciseId) {
    return null
  }

  return planned.name
}

/**
 * "2 of 3 sets" when a performed exercise recorded more or fewer sets than the
 * session snapshot planned. Null when it matched, when nothing was planned
 * (older sessions have no snapshot) or when the exercise was skipped.
 */
export function formatSetDeviation(
  exercise: WorkoutSessionHistoryExercise,
): string | null {
  const plannedSets = exercise.plannedSets

  if (plannedSets === null || !isExercisePerformed(exercise)) {
    return null
  }

  const actualSets = exercise.sets.length

  return actualSets === plannedSets
    ? null
    : `${actualSets} of ${plannedSets} sets`
}

/**
 * Totals counted the same way as the session list (getWorkoutSessions), so a
 * session reads identically in both places.
 */
export function summarizeSession(details: WorkoutSessionHistoryDetails) {
  const plannedExercises = details.exercises.length
  const performedExercises = details.exercises.filter(isExercisePerformed).length
  // Sets logged on an exercise that was later skipped do not count, matching
  // the session list query.
  const performedSets = details.exercises.reduce(
    (total, exercise) =>
      exercise.isSkipped ? total : total + exercise.sets.length,
    0,
  )

  const shortExercises = details.exercises.filter(
    (exercise) =>
      exercise.plannedSets !== null &&
      isExercisePerformed(exercise) &&
      exercise.sets.length < exercise.plannedSets,
  ).length

  return {
    minutes: getSessionMinutes(details),
    plannedExercises,
    performedExercises,
    performedSets,
    skippedExercises: plannedExercises - performedExercises,
    shortExercises,
  }
}

type SessionDeviation = {
  skippedExercises: number
  /** Performed exercises that recorded fewer sets than planned. */
  shortExercises: number
}

/** Deterministic note for a session that fell short of its template. */
export function describePartialSession({
  skippedExercises,
  shortExercises,
}: SessionDeviation): string | null {
  const parts: string[] = []

  if (skippedExercises > 0) {
    parts.push(
      skippedExercises === 1
        ? 'Session ended early. 1 exercise was skipped.'
        : `Session ended early. ${skippedExercises} exercises were skipped.`,
    )
  }

  if (shortExercises > 0) {
    parts.push(
      shortExercises === 1
        ? '1 exercise recorded fewer sets than planned.'
        : `${shortExercises} exercises recorded fewer sets than planned.`,
    )
  }

  return parts.length > 0 ? parts.join(' ') : null
}
