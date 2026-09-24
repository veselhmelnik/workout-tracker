import { PersonalRecordBadge } from '@/components/ui/PersonalRecordBadge'
import { colors, fonts } from '@/constants/theme'
import type { WorkoutSessionHistoryExercise } from '@/repositories/workoutSessionHistoryRepository'
import { UNSET_MUSCLE_LABEL } from '@/utils/exerciseGroups'
import { formatHistorySets } from '@/utils/sessionFormat'
import {
  formatSetDeviation,
  getReplacedExerciseName,
  isExercisePerformed,
} from '@/utils/sessionHistoryFormat'
import { Pressable, StyleSheet, Text, View } from 'react-native'

type SessionExerciseRowProps = {
  exercise: WorkoutSessionHistoryExercise
  /** Opens the row's actions; the row is inert when omitted. */
  onPress?: (exercise: WorkoutSessionHistoryExercise) => void
}

function formatMuscles(exercise: WorkoutSessionHistoryExercise): string {
  const names = [exercise.primaryMuscle, ...exercise.secondaryMuscles]
    .filter((muscle) => muscle !== null)
    .map((muscle) => muscle.name)

  return names.length > 0 ? names.join(' · ') : UNSET_MUSCLE_LABEL
}

/**
 * Spoken as one row, so the replacement context carries to a screen reader
 * rather than living only in the secondary line.
 */
function buildAccessibilityLabel(
  exercise: WorkoutSessionHistoryExercise,
  replacedName: string | null,
  setDeviation: string | null,
): string {
  const parts = [exercise.exerciseName]

  if (replacedName) {
    parts.push(`instead of ${replacedName}`)
  }

  if (isExercisePerformed(exercise)) {
    parts.push(formatHistorySets(exercise, exercise.type))

    if (exercise.isPr) {
      parts.push('personal record')
    }

    if (setDeviation) {
      parts.push(setDeviation)
    }
  } else {
    parts.push('skipped')
  }

  return parts.join(', ')
}

/**
 * Name and result share the first line; muscles sit below. Skipped exercises
 * stay in place, dimmed and struck through, so the planned shape is readable.
 */
export function SessionExerciseRow({
  exercise,
  onPress,
}: SessionExerciseRowProps) {
  const isPerformed = isExercisePerformed(exercise)
  const setDeviation = formatSetDeviation(exercise)

  // What the workout planned here, when the session performed something else.
  const replacedName = getReplacedExerciseName(exercise)

  return (
    <Pressable
      accessibilityHint={onPress ? 'Opens actions for this result' : undefined}
      accessibilityLabel={buildAccessibilityLabel(
        exercise,
        replacedName,
        setDeviation,
      )}
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={() => onPress?.(exercise)}
      style={({ pressed }) => [
        styles.row,
        !isPerformed && styles.rowSkipped,
        pressed && styles.rowPressed,
      ]}
    >
      <View style={styles.line}>
        <Text
          style={[styles.name, !isPerformed && styles.nameSkipped]}
        >
          {exercise.exerciseName}
        </Text>

        {isPerformed ? (
          <View style={styles.resultGroup}>
            <Text style={styles.result}>
              {formatHistorySets(exercise, exercise.type)}
            </Text>

            {exercise.isPr ? <PersonalRecordBadge /> : null}
          </View>
        ) : (
          <Text style={styles.skippedTag}>SKIPPED</Text>
        )}
      </View>

      {/* Ordinary workout information, so it takes the muted secondary style
          rather than a badge or a warning colour. */}
      {replacedName ? (
        <Text numberOfLines={1} style={styles.replacedFrom}>
          Instead of {replacedName}
        </Text>
      ) : null}

      <View style={styles.line}>
        <Text numberOfLines={1} style={styles.muscles}>
          {formatMuscles(exercise)}
        </Text>

        {setDeviation ? (
          <Text style={styles.deviation}>{setDeviation}</Text>
        ) : null}
      </View>
    </Pressable>
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

  rowPressed: {
    opacity: 0.6,
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

  resultGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 1,
    gap: 8,
    marginLeft: 'auto',
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

  replacedFrom: {
    color: colors.textSecondary,
    fontSize: 12,
  },

  muscles: {
    color: colors.textMuted,
    flexShrink: 1,
    fontSize: 12,
  },

  deviation: {
    color: colors.textSecondary,
    fontSize: 11,
    marginLeft: 'auto',
  },
})
