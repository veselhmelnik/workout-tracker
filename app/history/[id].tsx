import { SessionExerciseRow } from '@/components/history/SessionExerciseRow'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { ErrorView, LoadingView } from '@/components/ui/StateViews'
import { colors, fonts, gutter, radius, spacing } from '@/constants/theme'
import { useAsyncData } from '@/hooks/useAsyncData'
import {
  deleteSessionExerciseHistory,
  deleteWorkoutSessionHistory,
  getWorkoutSessionHistoryDetails,
  type WorkoutSessionHistoryExercise,
} from '@/repositories/workoutSessionHistoryRepository'
import {
  describePartialSession,
  formatSessionTimeRange,
  summarizeSession,
} from '@/utils/sessionHistoryFormat'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useRef, useState } from 'react'
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function SessionDetailsScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()

  const [rowActions, setRowActions] =
    useState<WorkoutSessionHistoryExercise | null>(null)
  const isDeletingRef = useRef(false)

  const load = useCallback(async () => {
    // Joins workouts without an archive filter, so archived workouts' sessions open.
    const details = await getWorkoutSessionHistoryDetails(id)

    if (!details) {
      throw new Error('This session no longer exists.')
    }

    return details
  }, [id])

  const { data, isLoading, error, reload } = useAsyncData(load, [id])

  const returnToHistory = () => {
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace('/history')
    }
  }

  /** Runs one deletion at a time; failures keep the screen and its data. */
  const runDeletion = async (
    action: () => Promise<{ deletedSession: boolean }>,
    errorTitle: string,
  ) => {
    if (isDeletingRef.current) {
      return
    }

    isDeletingRef.current = true

    try {
      const { deletedSession } = await action()

      setRowActions(null)

      if (deletedSession) {
        // Nothing left to show; History refetches on focus.
        returnToHistory()
      } else {
        // Counts, set totals and PR badges all recompute from the reload.
        await reload()
      }
    } catch (deleteError) {
      Alert.alert(
        errorTitle,
        deleteError instanceof Error
          ? deleteError.message
          : String(deleteError),
      )
    } finally {
      isDeletingRef.current = false
    }
  }

  const confirmDeleteSession = () => {
    Alert.alert(
      'Delete workout?',
      "This workout and all of its recorded exercise data will be permanently deleted from your history. This can't be undone.",
      [
        { text: 'Keep Workout', style: 'cancel' },
        {
          text: 'Delete Workout',
          style: 'destructive',
          onPress: () =>
            runDeletion(async () => {
              await deleteWorkoutSessionHistory(id)

              return { deletedSession: true }
            }, 'Could not delete workout'),
        },
      ],
    )
  }

  const confirmDeleteResult = (exercise: WorkoutSessionHistoryExercise) => {
    // Removing the only exercise would leave an empty session, so the wording
    // says what actually happens; the repository enforces it either way.
    const isLastExercise = (data?.exercises.length ?? 0) <= 1

    Alert.alert(
      isLastExercise ? 'Delete workout?' : 'Delete exercise result?',
      isLastExercise
        ? 'This is the only exercise in this workout. Deleting it will also remove the workout from your history. This can’t be undone.'
        : "This recorded exercise and its sets will be permanently removed from this workout history. This can't be undone.",
      [
        { text: isLastExercise ? 'Keep Workout' : 'Keep Result', style: 'cancel' },
        {
          text: isLastExercise ? 'Delete Workout' : 'Delete Result',
          style: 'destructive',
          onPress: () =>
            runDeletion(
              () => deleteSessionExerciseHistory(exercise.sessionExerciseId),
              'Could not delete exercise result',
            ),
        },
      ],
    )
  }

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
  const partialNote = describePartialSession(summary)

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
          <SessionExerciseRow
            exercise={exercise}
            key={exercise.sessionExerciseId}
            onPress={setRowActions}
          />
        ))}

        {partialNote ? <Text style={styles.note}>{partialNote}</Text> : null}

        {error ? (
          <Text style={styles.stale}>
            Could not refresh this session. Showing saved results.
          </Text>
        ) : null}

        {/* Visible but low emphasis, and never hidden behind an icon. */}
        <Pressable
          accessibilityHint="Permanently removes this workout from your history"
          accessibilityRole="button"
          onPress={confirmDeleteSession}
          style={({ pressed }) => [
            styles.deleteSession,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.deleteSessionLabel}>
            Delete workout from history
          </Text>
        </Pressable>
      </ScrollView>

      <BottomSheet onClose={() => setRowActions(null)} visible={rowActions !== null}>
        <Text style={styles.sheetTitle}>{rowActions?.exerciseName}</Text>

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            const exerciseId = rowActions?.exerciseId

            setRowActions(null)

            if (exerciseId) {
              router.push(`/exercise/${exerciseId}`)
            }
          }}
          style={({ pressed }) => [styles.sheetRow, pressed && styles.pressed]}
        >
          <Text style={styles.sheetRowLabel}>View Exercise</Text>
          <Text style={styles.sheetChevron}>›</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => rowActions && confirmDeleteResult(rowActions)}
          style={({ pressed }) => [styles.sheetRow, pressed && styles.pressed]}
        >
          <Text style={[styles.sheetRowLabel, styles.sheetRowDestructive]}>
            Delete from History
          </Text>
        </Pressable>
      </BottomSheet>
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

  deleteSession: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xxl,
    minHeight: 44,
  },

  deleteSessionLabel: {
    color: colors.destructive,
    fontSize: 14.5,
    fontWeight: '600',
  },

  sheetTitle: {
    color: colors.textPrimary,
    fontSize: 16.5,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },

  sheetRow: {
    alignItems: 'center',
    borderTopColor: colors.divider,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 52,
  },

  sheetRowLabel: {
    color: colors.textPrimary,
    fontSize: 15.5,
  },

  sheetRowDestructive: {
    color: colors.destructive,
    fontWeight: '600',
  },

  sheetChevron: {
    color: colors.textMuted,
    fontSize: 17,
  },

  pressed: {
    opacity: 0.6,
  },
})
