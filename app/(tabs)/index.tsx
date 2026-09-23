import { Button } from '@/components/ui/Button'
import { SectionLabel } from '@/components/ui/Fields'
import { EmptyView, ErrorView, LoadingView } from '@/components/ui/StateViews'
import { colors, fontSize, gutter, radius, spacing } from '@/constants/theme'
import { useAsyncData } from '@/hooks/useAsyncData'
import {
  getWorkoutById,
  getWorkouts,
  type WorkoutListItem,
} from '@/repositories/workoutRepository'
import {
  getActiveWorkoutSession,
  getWorkoutSessionDetails,
  startWorkout,
} from '@/repositories/workoutSessionRepository'
import {
  formatDayMonth,
  formatExerciseCount,
  formatStartedAgo,
} from '@/utils/format'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

type ActiveSessionSummary = {
  sessionId: string
  workoutName: string
  startedAt: string
  doneCount: number
  totalCount: number
}

type WorkoutsScreenData = {
  workouts: WorkoutListItem[]
  activeSession: ActiveSessionSummary | null
}

async function loadScreenData(): Promise<WorkoutsScreenData> {
  const [workouts, session] = await Promise.all([
    getWorkouts(),
    getActiveWorkoutSession(),
  ])

  if (!session) {
    return { workouts, activeSession: null }
  }

  const [details, workout] = await Promise.all([
    getWorkoutSessionDetails(session.id),
    getWorkoutById(session.workoutId),
  ])

  const exercises = details?.exercises ?? []

  return {
    workouts,
    activeSession: {
      sessionId: session.id,
      workoutName: workout?.name ?? 'Workout',
      startedAt: session.startedAt,
      doneCount: exercises.filter((exercise) =>
        exercise.sets.some((set) => set.reps !== null),
      ).length,
      totalCount: exercises.length,
    },
  }
}

export default function WorkoutsScreen() {
  const router = useRouter()
  const { data, isLoading, error, reload } = useAsyncData(loadScreenData)
  const [startingId, setStartingId] = useState<string | null>(null)

  const activeSession = data?.activeSession ?? null

  const handleStart = async (workout: WorkoutListItem) => {
    if (startingId) {
      return
    }

    setStartingId(workout.id)

    try {
      const session = await startWorkout(workout.id)

      router.push(`/session/${session.id}`)
    } catch (startError) {
      Alert.alert(
        'Could not start workout',
        startError instanceof Error ? startError.message : String(startError),
      )

      // The session may have been created before the failure; re-read it.
      reload()
    } finally {
      setStartingId(null)
    }
  }

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Settings lives outside the three tabs, reached from this header. */}
        <View style={styles.titleRow}>
          <Text style={styles.screenTitle}>My Workouts</Text>

          <Pressable
            accessibilityHint="Opens app settings"
            accessibilityLabel="Settings"
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => router.push('/settings')}
            style={({ pressed }) => [
              styles.settingsButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.settingsLabel}>Settings</Text>
          </Pressable>
        </View>

        {isLoading && !data ? <LoadingView /> : null}

        {error ? <ErrorView error={error} onRetry={reload} /> : null}

        {activeSession ? (
          <View style={[styles.card, styles.activeCard]}>
            <View style={styles.badgeRow}>
              <View style={styles.activeDot} />
              <Text style={styles.badge}>IN PROGRESS</Text>
            </View>

            <Text style={styles.activeTitle}>{activeSession.workoutName}</Text>
            <Text style={styles.activeMeta}>
              {formatStartedAgo(activeSession.startedAt)} ·{' '}
              {activeSession.doneCount} / {activeSession.totalCount} done
            </Text>

            <View style={styles.cardAction}>
              <Button
                label="Continue Workout"
                onPress={() =>
                  router.push(`/session/${activeSession.sessionId}`)
                }
                variant="active"
              />
            </View>
          </View>
        ) : null}

        {data && activeSession ? (
          <View style={styles.sectionBreak}>
            <SectionLabel>Saved workouts</SectionLabel>
          </View>
        ) : null}

        {data && data.workouts.length === 0 ? (
          <EmptyView message="No workouts yet. Add one to get started." />
        ) : null}

        {data?.workouts.map((workout) => (
          // The card body and the Start button are separate touch targets, so
          // starting a workout never falls through to the edit navigation.
          <View key={workout.id} style={[styles.card, styles.workoutCard]}>
            <Pressable
              accessibilityHint="Opens the workout for editing"
              accessibilityRole="button"
              onPress={() => router.push(`/workout/${workout.id}`)}
              style={({ pressed }) => [
                styles.cardBody,
                pressed && styles.pressed,
              ]}
            >
              <Text numberOfLines={1} style={styles.cardTitle}>
                {workout.name}
              </Text>
              <Text numberOfLines={1} style={styles.cardMeta}>
                {formatExerciseCount(workout.exerciseCount)} ·{' '}
                {workout.lastPerformedAt
                  ? formatDayMonth(workout.lastPerformedAt)
                  : 'Never'}
              </Text>
            </Pressable>

            <Button
              busy={startingId === workout.id}
              disabled={activeSession !== null}
              label="Start"
              onPress={() => handleStart(workout)}
              size="compact"
              variant="secondary"
            />
          </View>
        ))}

        {data ? (
          <View style={styles.addButton}>
            <Button
              label="+ Add Workout"
              onPress={() => router.push('/workout/new')}
              variant="secondary"
            />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },

  content: {
    paddingBottom: spacing.xxl,
    paddingHorizontal: gutter,
    paddingTop: spacing.md,
  },

  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },

  screenTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.screenTitle,
    fontWeight: '700',
    letterSpacing: -0.56,
  },

  settingsButton: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 60,
  },

  settingsLabel: {
    color: colors.textSecondary,
    fontSize: 13.5,
    fontWeight: '600',
  },

  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },

  workoutCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },

  cardBody: {
    flex: 1,
    gap: 3,
  },

  activeCard: {
    backgroundColor: colors.activeSurface,
    borderColor: colors.activeBorder,
    marginBottom: 0,
  },

  badgeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
    marginBottom: 5,
  },

  activeDot: {
    backgroundColor: colors.active,
    borderRadius: 3,
    height: 6,
    width: 6,
  },

  badge: {
    color: colors.activeText,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
  },

  activeTitle: {
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.2,
  },

  activeMeta: {
    color: colors.activeMeta,
    fontSize: fontSize.meta,
    marginTop: 5,
  },

  cardTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.cardTitle,
    fontWeight: '600',
  },

  cardMeta: {
    color: colors.textMuted,
    fontSize: fontSize.meta,
  },

  cardAction: {
    marginTop: spacing.md,
  },

  sectionBreak: {
    marginBottom: 2,
    marginTop: spacing.sm,
  },

  addButton: {
    marginTop: spacing.xs,
  },

  pressed: {
    opacity: 0.85,
  },
})
