import {
  HistoryEmptyRow,
  HistoryRow,
} from '@/components/history/HistoryRow'
import { WorkoutSelector } from '@/components/history/WorkoutSelector'
import { EmptyView, ErrorView, LoadingView } from '@/components/ui/StateViews'
import {
  colors,
  fontSize,
  gutter,
  labelText,
  spacing,
} from '@/constants/theme'
import { useAsyncData } from '@/hooks/useAsyncData'
import { getWorkoutHistory } from '@/repositories/historyRepository'
import { getWorkouts } from '@/repositories/workoutRepository'
import { formatDayMonth } from '@/utils/format'
import { formatHistorySets } from '@/utils/sessionFormat'
import { useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function HistoryScreen() {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const {
    data: workouts,
    isLoading: isLoadingWorkouts,
    error: workoutsError,
    reload: reloadWorkouts,
  } = useAsyncData(getWorkouts)

  // Default to the first workout until the user picks another one.
  const activeId =
    selectedId && workouts?.some((workout) => workout.id === selectedId)
      ? selectedId
      : (workouts?.[0]?.id ?? null)

  const loadHistory = useCallback(
    () => (activeId ? getWorkoutHistory(activeId) : Promise.resolve([])),
    [activeId],
  )

  const {
    data: history,
    isLoading: isLoadingHistory,
    error: historyError,
    reload: reloadHistory,
  } = useAsyncData(loadHistory, [activeId])

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>History</Text>

        {workouts && workouts.length > 0 ? (
          <View style={styles.selector}>
            <WorkoutSelector
              activeId={activeId}
              onSelect={setSelectedId}
              workouts={workouts}
            />
          </View>
        ) : null}
      </View>

      {isLoadingWorkouts && !workouts ? <LoadingView /> : null}

      {workoutsError ? (
        <ErrorView error={workoutsError} onRetry={reloadWorkouts} />
      ) : null}

      {workouts && workouts.length === 0 ? (
        <EmptyView message="No workouts yet. Create one to start building history." />
      ) : null}

      {historyError ? (
        <ErrorView error={historyError} onRetry={reloadHistory} />
      ) : null}

      {activeId && !historyError ? (
        <ScrollView contentContainerStyle={styles.content}>
          {isLoadingHistory && !history ? <LoadingView /> : null}

          {history && history.length === 0 ? (
            <EmptyView message="This workout has no exercises yet." />
          ) : null}

          {history?.map((exercise) => (
            <View key={exercise.exerciseId} style={styles.section}>
              <Pressable
                accessibilityHint="Opens the full history for this exercise"
                accessibilityRole="button"
                onPress={() =>
                  router.push(`/exercise/${exercise.exerciseId}/history`)
                }
                style={({ pressed }) => [
                  styles.sectionHeader,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.sectionLabel}>{exercise.name}</Text>
                <Text style={styles.chevron}>›</Text>
              </Pressable>

              {exercise.recent.length === 0 ? (
                <HistoryEmptyRow message="No history yet" />
              ) : (
                exercise.recent.map((item, itemIndex) => (
                  <HistoryRow
                    date={formatDayMonth(item.performedAt)}
                    isLatest={itemIndex === 0}
                    key={item.sessionExerciseId}
                    value={formatHistorySets(item, exercise.type)}
                  />
                ))
              )}
            </View>
          ))}
        </ScrollView>
      ) : null}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },

  header: {
    paddingTop: spacing.md,
  },

  screenTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.screenTitle,
    fontWeight: '700',
    letterSpacing: -0.56,
    marginBottom: spacing.lg,
    paddingHorizontal: gutter,
  },

  selector: {
    paddingHorizontal: gutter,
  },

  content: {
    paddingBottom: spacing.xxl,
    paddingHorizontal: gutter,
    paddingTop: spacing.sm,
  },

  // Generous break between exercises keeps long histories scannable.
  section: {
    marginTop: spacing.xxl,
  },

  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
    minHeight: 36,
  },

  sectionLabel: {
    ...labelText,
    color: colors.textSecondary,
    flex: 1,
    fontSize: 11.5,
  },

  chevron: {
    color: colors.textMuted,
    fontSize: 16,
  },

  pressed: {
    opacity: 0.6,
  },
})
