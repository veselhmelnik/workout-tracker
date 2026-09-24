import { DateBlock } from '@/components/ui/DateBlock'
import { colors, fonts, labelText } from '@/constants/theme'
import type { WorkoutSessionHistoryItem } from '@/repositories/workoutSessionHistoryRepository'
import {
  formatExerciseProgress,
  formatSetCount,
  getSessionMinutes,
} from '@/utils/sessionHistoryFormat'
import { memo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

type SessionRowProps = {
  session: WorkoutSessionHistoryItem
  /** The most recent session is at full weight, the rest at secondary. */
  isLatest: boolean
  onPress: (sessionId: string) => void
}

export const SessionRow = memo(function SessionRow({
  session,
  isLatest,
  onPress,
}: SessionRowProps) {
  return (
    <Pressable
      accessibilityHint="Opens the session details"
      accessibilityRole="button"
      onPress={() => onPress(session.id)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <DateBlock isMuted={!isLatest} isoDate={session.finishedAt} />

      <View style={styles.body}>
        <Text
          numberOfLines={1}
          style={[styles.name, !isLatest && styles.nameMuted]}
        >
          {session.workoutName}
        </Text>
        <Text numberOfLines={1} style={styles.meta}>
          {getSessionMinutes(session)} min ·{' '}
          {formatExerciseProgress(
            session.performedExercises,
            session.plannedExercises,
          )}{' '}
          · {formatSetCount(session.performedSets)}
        </Text>
      </View>

      {/* Summary of the exercise results inside, not a session-level award. */}
      {session.prCount > 0 ? (
        <Text style={styles.prCount}>
          {session.prCount} {session.prCount === 1 ? 'PR' : 'PRs'}
        </Text>
      ) : null}

      <Text style={styles.chevron}>›</Text>
    </Pressable>
  )
})

export function MonthHeading({ label }: { label: string }) {
  return <Text style={styles.month}>{label}</Text>
}

/** Placeholder at the final row height, so loading does not jump. */
export function SessionRowSkeleton({ index }: { index: number }) {
  const widths = ['38%', '30%', '44%', '34%'] as const

  return (
    <View style={styles.row}>
      <View style={styles.skeletonDate} />
      <View style={[styles.body, styles.skeletonBody]}>
        <View
          style={[styles.skeletonName, { width: widths[index % widths.length] }]}
        />
        <View style={styles.skeletonMeta} />
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
    gap: 14,
    minHeight: 64,
    paddingVertical: 12,
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
    fontWeight: '600',
  },

  nameMuted: {
    color: colors.textSecondary,
  },

  meta: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 12.5,
    fontVariant: ['tabular-nums'],
  },

  prCount: {
    color: colors.success,
    fontSize: 11.5,
    fontWeight: '600',
  },

  chevron: {
    color: colors.textMuted,
    fontSize: 17,
  },

  month: {
    ...labelText,
    backgroundColor: colors.background,
    color: colors.textMuted,
    fontSize: 10,
    paddingBottom: 4,
    paddingTop: 18,
  },

  skeletonDate: {
    backgroundColor: colors.elevated,
    borderRadius: 3,
    height: 30,
    marginHorizontal: 12,
    width: 28,
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
    width: '56%',
  },
})
