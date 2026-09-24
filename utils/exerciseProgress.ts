import type { ExerciseHistoryItem } from '@/repositories/historyRepository'
import type { ExerciseType } from '@/types/entities'
import { formatDayMonth, formatTimeOfDay } from './format'
import { getOccurrenceMetric } from './personalRecords'

export type ExerciseProgressPoint = {
  sessionExerciseId: string
  performedAt: string
  value: number
  isPr: boolean
}

/**
 * Chart points from the history already loaded for this exercise, oldest
 * first. The value is the same metric PR detection and the history summary
 * use — best set volume, or best reps for bodyweight — so the three never
 * disagree. Occurrences without a usable metric are dropped rather than
 * charted as zero.
 */
export function buildProgressPoints(
  history: ExerciseHistoryItem[],
  type: ExerciseType,
): ExerciseProgressPoint[] {
  const points: ExerciseProgressPoint[] = []

  for (const item of history) {
    const value = getOccurrenceMetric(item.sets, type)

    if (value === null) {
      continue
    }

    points.push({
      sessionExerciseId: item.sessionExerciseId,
      performedAt: item.performedAt,
      value,
      isPr: item.isPr,
    })
  }

  // History arrives newest first; a chart reads left to right in time.
  return points.sort((a, b) => {
    const byTime = a.performedAt.localeCompare(b.performedAt)

    return byTime !== 0
      ? byTime
      : a.sessionExerciseId.localeCompare(b.sessionExerciseId)
  })
}

export type ChartDomain = { min: number; max: number }

/**
 * Padded value range. Starting at zero would flatten real progress (500 →
 * 540 looks identical), so the domain hugs the data with 12% headroom and
 * never clips a point. Identical values get a symmetric band so the line
 * lands in the middle instead of on an edge.
 */
export function getChartDomain(values: number[]): ChartDomain {
  if (values.length === 0) {
    return { min: 0, max: 1 }
  }

  const min = Math.min(...values)
  const max = Math.max(...values)

  if (min === max) {
    const band = Math.abs(min) * 0.1 || 1

    return { min: min - band, max: max + band }
  }

  const padding = (max - min) * 0.12

  return { min: min - padding, max: max + padding }
}

export type ChartPointPosition = { x: number; y: number }

/**
 * Maps values onto the plot area. A single point is centred horizontally,
 * because there is no progression to spread across the width.
 */
export function mapPointsToCoordinates(
  values: number[],
  domain: ChartDomain,
  width: number,
  height: number,
): ChartPointPosition[] {
  const span = domain.max - domain.min || 1

  return values.map((value, index) => ({
    x:
      values.length === 1
        ? width / 2
        : (index / (values.length - 1)) * width,
    y: height - ((value - domain.min) / span) * height,
  }))
}

/**
 * Indexes to label on the x axis: first, last and an evenly spaced few in
 * between, so 100 points do not print 100 dates.
 */
export function getChartLabelIndexes(
  pointCount: number,
  maxLabels = 3,
): number[] {
  if (pointCount <= 0) {
    return []
  }

  if (pointCount <= maxLabels) {
    return Array.from({ length: pointCount }, (_, index) => index)
  }

  const step = (pointCount - 1) / (maxLabels - 1)

  return Array.from({ length: maxLabels }, (_, index) =>
    Math.round(index * step),
  )
}

export type ChartLabel = {
  index: number
  text: string
  /** Where the text sits relative to its point, to keep edges inside. */
  anchor: 'start' | 'middle' | 'end'
}

/**
 * Labels for the chosen x positions. Several sessions can share a calendar
 * day, which would print the same date two or three times; those labels get
 * the locale's clock time appended so they stay distinguishable.
 */
export function buildChartLabels(
  points: { performedAt: string }[],
  indexes: number[],
): ChartLabel[] {
  const dates = indexes.map((index) => formatDayMonth(points[index].performedAt))

  const duplicated = new Set(
    dates.filter((date, position) => dates.indexOf(date) !== position),
  )

  return indexes.map((index, position) => ({
    index,
    text: duplicated.has(dates[position])
      ? `${dates[position]} · ${formatTimeOfDay(points[index].performedAt)}`
      : dates[position],
    anchor:
      position === 0
        ? 'start'
        : position === indexes.length - 1
          ? 'end'
          : 'middle',
  }))
}

/** Evenly spaced reference values across the domain, for the y gridlines. */
export function getChartGridValues(
  domain: ChartDomain,
  lineCount = 4,
): number[] {
  const step = (domain.max - domain.min) / (lineCount - 1)

  return Array.from({ length: lineCount }, (_, index) => domain.min + index * step)
}
