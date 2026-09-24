import { PersonalRecordBadge } from '@/components/ui/PersonalRecordBadge'
import { colors, fonts, spacing } from '@/constants/theme'
import type { ExerciseType } from '@/types/entities'
import { formatDayMonth } from '@/utils/format'
import type { ExerciseProgressPoint } from '@/utils/exerciseProgress'
import { formatBestSetVolume } from '@/utils/sessionFormat'
import { useState } from 'react'
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native'
import { ProgressChart } from './ProgressChart'

type ProgressCardProps = {
  points: ExerciseProgressPoint[]
  type: ExerciseType
}

/** "Best set volume" for weighted work, "Best reps" for bodyweight. */
function metricLabel(type: ExerciseType): string {
  return type === 'WEIGHTED' ? 'Best set volume' : 'Best reps'
}

/** Weighted values are weight × reps of one set, so the unit is kg·reps. */
function formatMetricValue(value: number, type: ExerciseType): string {
  return type === 'WEIGHTED'
    ? formatBestSetVolume(value)
    : `${value} ${value === 1 ? 'rep' : 'reps'}`
}

function buildAccessibilitySummary(
  points: ExerciseProgressPoint[],
  type: ExerciseType,
): string {
  const first = points[0].value
  const last = points[points.length - 1].value

  const direction =
    last > first ? 'increased' : last < first ? 'decreased' : 'stayed at'

  const sessions = `${points.length} ${points.length === 1 ? 'session' : 'sessions'}`

  if (points.length === 1 || direction === 'stayed at') {
    return `Progress chart. ${metricLabel(type)} ${formatMetricValue(last, type)} across ${sessions}.`
  }

  return `Progress chart. ${metricLabel(type)} ${direction} from ${formatMetricValue(first, type)} to ${formatMetricValue(last, type)} across ${sessions}.`
}

export function ProgressCard({ points, type }: ProgressCardProps) {
  const [width, setWidth] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const handleLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width)
  }

  if (points.length === 0) {
    return (
      <View style={[styles.card, styles.cardEmpty]}>
        <Text style={styles.emptyTitle}>No progress data yet</Text>
        <Text style={styles.emptyBody}>
          Complete this exercise in a workout to start tracking progress.
        </Text>
      </View>
    )
  }

  const latest = points[points.length - 1]
  const selected =
    points.find((point) => point.sessionExerciseId === selectedId) ?? null

  return (
    <View
      accessible
      accessibilityLabel={buildAccessibilitySummary(points, type)}
      onLayout={handleLayout}
      style={styles.card}
    >
      <Text style={styles.metricLabel}>{metricLabel(type)}</Text>
      <Text style={styles.metricValue}>
        {formatMetricValue(latest.value, type)}
      </Text>

      {points.length > 1 ? (
        <View style={styles.chart}>
          <ProgressChart
            onSelectPoint={(point) =>
              setSelectedId((current) =>
                current === point.sessionExerciseId
                  ? null
                  : point.sessionExerciseId,
              )
            }
            points={points}
            selectedId={selectedId}
            width={width}
          />
        </View>
      ) : null}

      <View style={styles.footer}>
        {selected ? (
          // Tapped point details, in place of the session count.
          <View style={styles.selected}>
            <Text style={styles.selectedDate}>
              {formatDayMonth(selected.performedAt)}
            </Text>
            <Text style={styles.selectedValue}>
              {formatMetricValue(selected.value, type)}
            </Text>
            {selected.isPr ? <PersonalRecordBadge /> : null}
          </View>
        ) : (
          <Text style={styles.sessions}>
            {points.length === 1
              ? '1 session recorded'
              : `${points.length} sessions`}
          </Text>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.strip,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
  },

  cardEmpty: {
    borderStyle: 'dashed',
    gap: 5,
    paddingVertical: spacing.lg,
  },

  emptyTitle: {
    color: colors.textSecondary,
    fontSize: 13.5,
    fontWeight: '600',
  },

  emptyBody: {
    color: colors.textMuted,
    fontSize: 12.5,
    lineHeight: 19,
  },

  metricLabel: {
    color: colors.textMuted,
    fontSize: 12,
  },

  metricValue: {
    color: colors.textPrimary,
    fontFamily: fonts.mono,
    fontSize: 20,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
    marginTop: 2,
  },

  chart: {
    marginTop: spacing.md,
  },

  footer: {
    borderTopColor: colors.divider,
    borderTopWidth: 1,
    marginTop: spacing.md,
    minHeight: 34,
    justifyContent: 'center',
    paddingTop: spacing.sm,
  },

  sessions: {
    color: colors.textMuted,
    fontSize: 12,
  },

  selected: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },

  selectedDate: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 12,
  },

  selectedValue: {
    color: colors.textPrimary,
    fontFamily: fonts.mono,
    fontSize: 13.5,
    fontWeight: '600',
  },

})
