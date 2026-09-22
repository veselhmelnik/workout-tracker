import { colors, fonts } from '@/constants/theme'
import type { WorkoutSessionHistoryExercise } from '@/repositories/workoutSessionHistoryRepository'
import { UNSET_MUSCLE_LABEL } from '@/utils/exerciseGroups'
import { formatHistorySets } from '@/utils/sessionFormat'
import { isExercisePerformed } from '@/utils/sessionHistoryFormat'
import { StyleSheet, Text, View } from 'react-native'

type SessionExerciseRowProps = {
  exercise: WorkoutSessionHistoryExercise
}

function formatMuscles(exercise: WorkoutSessionHistoryExercise): string {
  const names = [exercise.primaryMuscle, ...exercise.secondaryMuscles]
    .filter((muscle) => muscle !== null)
    .map((muscle) => muscle.name)

  return names.length > 0 ? names.join(' · ') : UNSET_MUSCLE_LABEL
}

/**
 * Name and result share the first line; muscles sit below. Skipped exercises
 * stay in place, dimmed and struck through, so the planned shape is readable.
 */
export function SessionExerciseRow({ exercise }: SessionExerciseRowProps) {
  const isPerformed = isExercisePerformed(exercise)

  return (
    <View style={[styles.row, !isPerformed && styles.rowSkipped]}>
      <View style={styles.line}>
        <Text
          style={[styles.name, !isPerformed && styles.nameSkipped]}
        >
          {exercise.exerciseName}
        </Text>

        {isPerformed ? (
          <Text style={styles.result}>
            {formatHistorySets(exercise, exercise.type)}
          </Text>
        ) : (
          <Text style={styles.skippedTag}>SKIPPED</Text>
        )}
      </View>

      <Text numberOfLines={1} style={styles.muscles}>
        {formatMuscles(exercise)}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
    gap: 4,
    paddingVertical: 13,
  },

  rowSkipped: {
    opacity: 0.55,
  },

  line: {
    alignItems: 'baseline',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },

  name: {
    color: colors.textPrimary,
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '500',
  },

  nameSkipped: {
    textDecorationColor: colors.disabledText,
    textDecorationLine: 'line-through',
  },

  // Long mixed-weight results wrap under the name rather than scrolling.
  result: {
    color: colors.textPrimary,
    flexShrink: 1,
    fontFamily: fonts.mono,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
    marginLeft: 'auto',
    textAlign: 'right',
  },

  skippedTag: {
    borderColor: colors.border,
    borderRadius: 3,
    borderWidth: 1,
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    overflow: 'hidden',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },

  muscles: {
    color: colors.textMuted,
    fontSize: 12,
  },
})
