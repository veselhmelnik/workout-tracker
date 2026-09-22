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
 * Totals counted the same way as the session list (getWorkoutSessions), so a
 * session reads identically in both places.
 */
export function summarizeSession(details: WorkoutSessionHistoryDetails) {
  const plannedExercises = details.exercises.length
  const performedExercises = details.exercises.filter(isExercisePerformed).length
  const performedSets = details.exercises.reduce(
    (total, exercise) => total + exercise.sets.length,
    0,
  )

  return {
    minutes: getSessionMinutes(details),
    plannedExercises,
    performedExercises,
    performedSets,
    skippedExercises: plannedExercises - performedExercises,
  }
}

/**
 * Deterministic note for a session that fell short. Planned set counts are not
 * snapshotted per session, so it speaks only about skipped exercises.
 */
export function describePartialSession(skippedExercises: number): string | null {
  if (skippedExercises <= 0) {
    return null
  }

  return skippedExercises === 1
    ? 'Session ended early. 1 exercise was skipped.'
    : `Session ended early. ${skippedExercises} exercises were skipped.`
}
