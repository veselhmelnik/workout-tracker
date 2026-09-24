import type { ExerciseType } from '@/types/entities'

type HistorySet = {
  setNumber: number
  weight: number | null
  reps: number | null
}

type HistoryOccurrence = {
  sessionExerciseId: string
  performedAt: string
  sets: HistorySet[]
}

/**
 * Best single-set volume: max(weight × reps) across the sets of one
 * occurrence. Sets without both a weight and reps are ignored. This is the
 * same definition getExerciseHistorySummary uses for "best set volume".
 */
export function getWeightedBestSetVolume(sets: HistorySet[]): number | null {
  let best: number | null = null

  for (const set of sets) {
    if (set.weight === null || set.reps === null) {
      continue
    }

    const volume = set.weight * set.reps

    if (best === null || volume > best) {
      best = volume
    }
  }

  return best
}

/** Best reps in one set across the sets of one occurrence. */
export function getBodyweightBestReps(sets: HistorySet[]): number | null {
  let best: number | null = null

  for (const set of sets) {
    if (set.reps === null) {
      continue
    }

    if (best === null || set.reps > best) {
      best = set.reps
    }
  }

  return best
}

/** The single PR metric for an exercise; null when no set qualifies. */
export function getOccurrenceMetric(
  sets: HistorySet[],
  type: ExerciseType,
): number | null {
  return type === 'WEIGHTED'
    ? getWeightedBestSetVolume(sets)
    : getBodyweightBestReps(sets)
}

/**
 * Marks each occurrence that beat every earlier one.
 *
 * Walks oldest → newest keeping a running best, so a result is only ever
 * compared against the past. Strictly greater wins: a tie is not a PR. The
 * first occurrence with a usable metric is a PR by definition — it sets the
 * baseline.
 *
 * Order is by performedAt ascending, with sessionExerciseId as a stable
 * tie-breaker so two sessions finished on the same timestamp always resolve
 * the same way. The input order (newest-first for the UI) is preserved in the
 * returned array.
 */
export function annotateWithPersonalRecords<T extends HistoryOccurrence>(
  occurrences: T[],
  type: ExerciseType,
): (T & { isPr: boolean })[] {
  const chronological = [...occurrences].sort((a, b) => {
    const byTime = a.performedAt.localeCompare(b.performedAt)

    return byTime !== 0
      ? byTime
      : a.sessionExerciseId.localeCompare(b.sessionExerciseId)
  })

  const personalRecords = new Set<string>()
  let best: number | null = null

  for (const occurrence of chronological) {
    const metric = getOccurrenceMetric(occurrence.sets, type)

    if (metric === null) {
      continue
    }

    if (best === null || metric > best) {
      best = metric
      personalRecords.add(occurrence.sessionExerciseId)
    }
  }

  return occurrences.map((occurrence) => ({
    ...occurrence,
    isPr: personalRecords.has(occurrence.sessionExerciseId),
  }))
}
