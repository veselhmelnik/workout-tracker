import { DateBlock } from '@/components/ui/DateBlock'
import { colors, fonts } from '@/constants/theme'
import { StyleSheet, Text, View } from 'react-native'

type ExerciseResultRowProps = {
  performedAt: string
  /** Formatted sets, e.g. "55 kg · 5/5/5" or "80×8 · 80×7 · 75×9". */
  value: string
  /** Workout name, shown under the value in the full history. */
  context?: string
  /** The newest result leads; older ones step down to secondary text. */
  isLatest: boolean
  isLast?: boolean
}

export function ExerciseResultRow({
  performedAt,
  value,
  context,
  isLatest,
  isLast = false,
}: ExerciseResultRowProps) {
  return (
    <View style={[styles.row, isLast && styles.rowLast]}>
      <DateBlock isMuted={!isLatest} isoDate={performedAt} />

      <View style={styles.body}>
        {/* Wraps rather than scrolling sideways when many sets are logged. */}
        <Text style={[styles.value, !isLatest && styles.older]}>{value}</Text>
        {context ? (
          <Text numberOfLines={1} style={styles.context}>
            {context}
          </Text>
        ) : null}
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
    paddingVertical: 12,
  },

  rowLast: {
    borderBottomWidth: 0,
  },

  body: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },

  value: {
    color: colors.textPrimary,
    fontFamily: fonts.mono,
    fontSize: 15.5,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },

  older: {
    color: colors.textSecondary,
  },

  context: {
    color: colors.textMuted,
    fontSize: 11.5,
  },
})
