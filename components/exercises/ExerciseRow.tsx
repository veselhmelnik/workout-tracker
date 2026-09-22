import { colors, fonts, labelText } from '@/constants/theme'
import type { ExerciseDetails } from '@/types/entities'
import { formatExerciseMuscles } from '@/utils/exerciseGroups'
import { memo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

/** Row height in the design; skeleton rows use the same value. */
export const EXERCISE_ROW_HEIGHT = 64

type ExerciseRowProps = {
  details: ExerciseDetails
  onPress: (exerciseId: string) => void
}

/** Separator row: name, primary-then-secondary muscles, type, chevron. */
export const ExerciseRow = memo(function ExerciseRow({
  details,
  onPress,
}: ExerciseRowProps) {
  const { exercise } = details

  return (
    <Pressable
      accessibilityHint="Opens exercise details"
      accessibilityRole="button"
      onPress={() => onPress(exercise.id)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.body}>
        <Text numberOfLines={1} style={styles.name}>
          {exercise.name}
        </Text>
        <Text
          numberOfLines={1}
          style={[
            styles.muscles,
            !details.primaryMuscle && styles.musclesUnset,
          ]}
        >
          {formatExerciseMuscles(details)}
        </Text>
      </View>

      <Text style={styles.type}>
        {exercise.type === 'WEIGHTED' ? 'Weighted' : 'Bodyweight'}
      </Text>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  )
})

type ExerciseSectionHeaderProps = {
  label: string
  count?: number
}

export function ExerciseSectionHeader({
  label,
  count,
}: ExerciseSectionHeaderProps) {
  return (
    <View style={styles.header}>
      <Text numberOfLines={1} style={styles.headerLabel}>
        {label}
      </Text>

      {count !== undefined ? (
        <Text style={styles.headerCount}>
          {count} {count === 1 ? 'exercise' : 'exercises'}
        </Text>
      ) : null}
    </View>
  )
}

export function ExerciseRowSkeleton({ index }: { index: number }) {
  // Vary the bar widths so a column of placeholders does not look mechanical.
  const nameWidths = ['52%', '64%', '46%', '58%'] as const
  const metaWidths = ['34%', '28%', '38%', '30%'] as const

  return (
    <View style={styles.row}>
      <View style={[styles.body, styles.skeletonBody]}>
        <View
          style={[
            styles.skeletonName,
            { width: nameWidths[index % nameWidths.length] },
          ]}
        />
        <View
          style={[
            styles.skeletonMeta,
            { width: metaWidths[index % metaWidths.length] },
          ]}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    height: EXERCISE_ROW_HEIGHT,
  },

  pressed: {
    opacity: 0.6,
  },

  body: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },

  name: {
    color: colors.textPrimary,
    fontSize: 15.5,
    fontWeight: '500',
  },

  muscles: {
    color: colors.textMuted,
    fontSize: 12.5,
  },

  musclesUnset: {
    fontStyle: 'italic',
  },

  type: {
    color: colors.textMuted,
    fontSize: 11.5,
  },

  chevron: {
    color: colors.textMuted,
    fontSize: 17,
  },

  header: {
    alignItems: 'baseline',
    backgroundColor: colors.background,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingBottom: 6,
    paddingTop: 17,
  },

  headerLabel: {
    ...labelText,
    color: colors.textMuted,
    flex: 1,
  },

  headerCount: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 11.5,
  },

  skeletonBody: {
    gap: 7,
  },

  skeletonName: {
    backgroundColor: colors.elevated,
    borderRadius: 3,
    height: 13,
  },

  skeletonMeta: {
    backgroundColor: colors.skeleton,
    borderRadius: 3,
    height: 11,
  },
})
