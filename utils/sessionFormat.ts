import type { ExerciseHistoryItem } from '@/repositories/historyRepository'
import type { ExerciseType } from '@/types/entities'

export function formatDuration(elapsedMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000))

  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const paddedSeconds = String(seconds).padStart(2, '0')

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${paddedSeconds}`
  }

  return `${minutes}:${paddedSeconds}`
}

/** "52.5 kg · 4/3/3" for weighted work, "12/10/9" when there is no weight. */
export function formatHistorySets(
  item: ExerciseHistoryItem,
  type: ExerciseType,
): string {
  const recorded = item.sets.filter((set) => set.reps !== null)

  if (recorded.length === 0) {
    return '—'
  }

  const reps = recorded.map((set) => set.reps).join('/')

  if (type === 'BODYWEIGHT') {
    return reps
  }

  const weights = recorded.map((set) => set.weight)

  if (weights.every((weight) => weight === null)) {
    return `BW · ${reps}`
  }

  const distinct = new Set(weights.map((weight) => String(weight)))

  if (distinct.size === 1 && weights[0] !== null) {
    return `${formatWeight(weights[0])} kg · ${reps}`
  }

  // Set weights differ, so show each set as weight×reps rather than pretending
  // a single weight covers them all.
  return recorded
    .map((set) =>
      set.weight === null
        ? `BW×${set.reps}`
        : `${formatWeight(set.weight)}×${set.reps}`,
    )
    .join(' · ')
}

export function formatWeight(weight: number): string {
  return String(Number(weight.toFixed(2)))
}

/** Parses a weight input, keeping null for an empty field rather than 0. */
export function parseWeightInput(value: string): number | null {
  const normalized = value.replace(',', '.').trim()

  if (!normalized) {
    return null
  }

  const parsed = Number(normalized)

  return Number.isFinite(parsed) ? parsed : null
}

/** Parses a reps input, keeping null for an empty field rather than 0. */
export function parseRepsInput(value: string): number | null {
  const digits = value.replace(/[^0-9]/g, '')

  if (!digits) {
    return null
  }

  return Number(digits)
}

export function weightToInput(weight: number | null): string {
  return weight === null ? '' : formatWeight(weight)
}

export function repsToInput(reps: number | null): string {
  return reps === null ? '' : String(reps)
}
