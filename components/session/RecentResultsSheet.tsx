import { LoadingView } from '@/components/ui/StateViews'
import { colors, fontSize, fonts, spacing } from '@/constants/theme'
import type { ExerciseHistoryItem } from '@/repositories/historyRepository'
import type { ExerciseType } from '@/types/entities'
import { formatDayMonth } from '@/utils/format'
import { formatHistorySets } from '@/utils/sessionFormat'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { StyleSheet, Text, View } from 'react-native'

type RecentResultsSheetProps = {
  visible: boolean
  exerciseName: string
  exerciseType: ExerciseType
  items: ExerciseHistoryItem[] | null
  isLoading: boolean
  onClose: () => void
}

export function RecentResultsSheet({
  visible,
  exerciseName,
  exerciseType,
  items,
  isLoading,
  onClose,
}: RecentResultsSheetProps) {
  return (
    <BottomSheet onClose={onClose} visible={visible}>
      <Text style={styles.title}>Recent — {exerciseName}</Text>

      {isLoading && !items ? <LoadingView /> : null}

      {items && items.length === 0 ? (
        <Text style={styles.empty}>No previous result</Text>
      ) : null}

      {items?.map((item) => (
        <View key={item.sessionExerciseId} style={styles.row}>
          <Text style={styles.date}>{formatDayMonth(item.performedAt)}</Text>

          <View style={styles.rowBody}>
            <Text style={styles.value}>
              {formatHistorySets(item, exerciseType)}
            </Text>
            <Text style={styles.workout}>{item.workoutName}</Text>
          </View>
        </View>
      ))}
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.headerTitle,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },

  empty: {
    color: colors.textMuted,
    fontSize: fontSize.body,
    paddingVertical: spacing.md,
  },

  row: {
    alignItems: 'baseline',
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: 10,
  },

  date: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 12.5,
    width: 68,
  },

  rowBody: {
    flex: 1,
    gap: 2,
  },

  value: {
    color: colors.textPrimary,
    fontFamily: fonts.mono,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },

  workout: {
    color: colors.textMuted,
    fontSize: 12.5,
  },
})
