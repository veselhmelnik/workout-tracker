import type { ExerciseType } from '@/types/entities'

export function formatDayMonth(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Stacked date for result rows: "18" over "SEP". Both parts come from the
 * device locale, so this yields "ВЕР." or "EYL" as well; never a fixed format.
 */
export function formatDateBlock(isoDate: string): { day: string; month: string } {
  const date = new Date(isoDate)

  return {
    day: date.toLocaleDateString(undefined, { day: '2-digit' }),
    month: date
      .toLocaleDateString(undefined, { month: 'short' })
      .toLocaleUpperCase(),
  }
}

export function formatLastPerformed(isoDate: string | null): string {
  return isoDate ? `Last: ${formatDayMonth(isoDate)}` : 'Never'
}

export function formatExerciseCount(count: number): string {
  return `${count} ${count === 1 ? 'exercise' : 'exercises'}`
}

export function formatStartedAgo(startedAt: string): string {
  const minutes = Math.max(
    0,
    Math.round((Date.now() - new Date(startedAt).getTime()) / 60_000),
  )

  if (minutes < 1) {
    return 'Started just now'
  }

  if (minutes < 60) {
    return `Started ${minutes} min ago`
  }

  const hours = Math.floor(minutes / 60)

  return `Started ${hours} h ${minutes % 60} min ago`
}

export function formatSetTarget(
  sets: number,
  repMin: number | null,
  repMax: number | null,
  type: ExerciseType,
): string {
  const setsLabel = `${sets} ${sets === 1 ? 'set' : 'sets'}`

  if (repMin !== null && repMax !== null) {
    const reps = repMin === repMax ? `${repMin}` : `${repMin}–${repMax}`

    return `${setsLabel} · ${reps} reps`
  }

  if (repMin !== null) {
    return `${setsLabel} · ${repMin}+ reps`
  }

  if (repMax !== null) {
    return `${setsLabel} · up to ${repMax} reps`
  }

  return `${setsLabel} · ${type === 'BODYWEIGHT' ? 'bodyweight' : 'no rep target'}`
}
