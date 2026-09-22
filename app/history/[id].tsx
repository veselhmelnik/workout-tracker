import { SessionExerciseRow } from '@/components/history/SessionExerciseRow'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { ErrorView, LoadingView } from '@/components/ui/StateViews'
import { colors, fonts, gutter, radius, spacing } from '@/constants/theme'
import { useAsyncData } from '@/hooks/useAsyncData'
import { getWorkoutSessionHistoryDetails } from '@/repositories/workoutSessionHistoryRepository'
import {
  describePartialSession,
  formatSessionTimeRange,
  summarizeSession,
} from '@/utils/sessionHistoryFormat'
import { useLocalSearchParams } from 'expo-router'
import { useCallback } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function SessionDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()

  const load = useCallback(async () => {
    // Joins workouts without an archive filter, so archived workouts' sessions open.
    const details = await getWorkoutSessionHistoryDetails(id)

    if (!details) {
      throw new Error('This session no longer exists.')
    }

    return details
  }, [id])

  const { data, isLoading, error, reload } = useAsyncData(load, [id])

  if (!data) {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <ScreenHeader title="Session" />
        <View style={styles.gate}>
          {isLoading ? (
            <LoadingView />
          ) : (
            <ErrorView
              error={error ?? new Error('This session no longer exists.')}
              onRetry={reload}
            />
          )}
        </View>
      </SafeAreaView>
    )
  }

  const summary = summarizeSession(data)
  const partialNote = describePartialSession(summary.skippedExercises)

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <ScreenHeader title="Session" />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.name}>{data.workoutName}</Text>
        <Text style={styles.time}>{formatSessionTimeRange(data)}</Text>

        {/* Three numbers as one strip, not three metric cards. */}
        <View style={styles.metrics}>
          <Metric label="DURATION" unit=" min" value={String(summary.minutes)} />
          <Metric
            label="EXERCISES"
            unit={
              summary.performedExercises === summary.plannedExercises
                ? undefined
                : ` / ${summary.plannedExercises}`
            }
            value={String(summary.performedExercises)}
          />
          <Metric label="SETS" value={String(summary.performedSets)} />
        </View>

        {/* Stored session order, skipped exercises included. */}
        {data.exercises.map((exercise) => (
          <SessionExerciseRow exercise={exercise} key={exercise.sessionExerciseId} />
        ))}

        {partialNote ? <Text style={styles.note}>{partialNote}</Text> : null}

        {error ? (
          <Text style={styles.stale}>
            Could not refresh this session. Showing saved results.
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

function Metric({
  label,
  value,
  unit,
}: {
  label: string
  value: string
  unit?: string
}) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>
        {value}
        {unit ? <Text style={styles.metricUnit}>{unit}</Text> : null}
      </Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },

  gate: {
    flex: 1,
    justifyContent: 'center',
  },

  content: {
    paddingBottom: spacing.xxl,
    paddingHorizontal: gutter,
    paddingTop: 18,
  },

  name: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
  },

  time: {
    color: colors.textSecondary,
    fontFamily: fonts.mono,
    fontSize: 13,
    marginTop: 5,
  },

  metrics: {
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
    borderTopColor: colors.divider,
    borderTopWidth: 1,
    flexDirection: 'row',
    marginTop: spacing.lg,
    paddingVertical: 13,
  },

  metric: {
    flex: 1,
    gap: 2,
  },

  metricValue: {
    color: colors.textPrimary,
    fontFamily: fonts.mono,
    fontSize: 19,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },

  metricUnit: {
    color: colors.textMuted,
    fontSize: 12,
  },

  metricLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },

  note: {
    backgroundColor: colors.strip,
    borderColor: colors.divider,
    borderLeftColor: colors.referenceRule,
    borderLeftWidth: 3,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.textSecondary,
    fontSize: 12.5,
    lineHeight: 19,
    marginTop: spacing.lg,
    overflow: 'hidden',
    paddingHorizontal: 13,
    paddingVertical: 11,
  },

  stale: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.lg,
  },
})
