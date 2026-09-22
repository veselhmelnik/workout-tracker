import { BottomSheet } from '@/components/ui/BottomSheet'
import { LoadingView } from '@/components/ui/StateViews'
import { colors, fontSize, spacing } from '@/constants/theme'
import {
  getWorkouts,
  type WorkoutListItem,
} from '@/repositories/workoutRepository'
import { formatExerciseCount } from '@/utils/format'
import { useEffect, useState } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native'

type AddToWorkoutSheetProps = {
  visible: boolean
  onClose: () => void
  onChoose: (workoutId: string) => void
}

/** Lists saved workouts; choosing one hands off to that workout's editor. */
export function AddToWorkoutSheet({
  visible,
  onClose,
  onChoose,
}: AddToWorkoutSheetProps) {
  const { height } = useWindowDimensions()

  const [workouts, setWorkouts] = useState<WorkoutListItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!visible) {
      return
    }

    let isActive = true

    setError(null)

    getWorkouts()
      .then((result) => {
        if (isActive) {
          setWorkouts(result)
        }
      })
      .catch((loadError: unknown) => {
        if (isActive) {
          setError(
            loadError instanceof Error ? loadError.message : String(loadError),
          )
        }
      })

    return () => {
      isActive = false
    }
  }, [visible])

  return (
    <BottomSheet onClose={onClose} visible={visible}>
      <View style={styles.header}>
        <Text style={styles.title}>Add to a workout</Text>
        <Text style={styles.subtitle}>Choose which workout</Text>
      </View>

      {error ? <Text style={styles.message}>{error}</Text> : null}

      {!error && workouts === null ? <LoadingView /> : null}

      {workouts && workouts.length === 0 ? (
        <Text style={styles.message}>
          No workouts yet. Create one from the Workout tab first.
        </Text>
      ) : null}

      {workouts && workouts.length > 0 ? (
        <ScrollView style={{ maxHeight: height * 0.5 }}>
          {workouts.map((workout) => (
            <Pressable
              accessibilityRole="button"
              key={workout.id}
              onPress={() => onChoose(workout.id)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <View style={styles.rowText}>
                <Text numberOfLines={1} style={styles.rowTitle}>
                  {workout.name}
                </Text>
                <Text style={styles.rowMeta}>
                  {formatExerciseCount(workout.exerciseCount)}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  header: {
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
    gap: 2,
    paddingBottom: spacing.md,
  },

  title: {
    color: colors.textPrimary,
    fontSize: 16.5,
    fontWeight: '600',
  },

  subtitle: {
    color: colors.textMuted,
    fontSize: 12,
  },

  message: {
    color: colors.textSecondary,
    fontSize: fontSize.meta,
    lineHeight: 20,
    paddingVertical: spacing.lg,
  },

  row: {
    alignItems: 'center',
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 56,
  },

  rowText: {
    flex: 1,
    gap: 2,
  },

  rowTitle: {
    color: colors.textPrimary,
    fontSize: 15.5,
    fontWeight: '500',
  },

  rowMeta: {
    color: colors.textMuted,
    fontSize: 12.5,
  },

  chevron: {
    color: colors.textMuted,
    fontSize: 17,
  },

  pressed: {
    opacity: 0.6,
  },
})
