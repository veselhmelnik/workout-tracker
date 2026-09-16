import { colors, fontSize, fonts, spacing } from '@/constants/theme'
import { StyleSheet, Text, View } from 'react-native'

type HistoryRowProps = {
  date: string
  value: string
  /** Workout name. When set, the row stacks "date · workout" above the value. */
  meta?: string
  /** Older rows step down to secondary text so the latest result leads. */
  isLatest?: boolean
}

/** One dense history line of monospace data. */
export function HistoryRow({
  date,
  value,
  meta,
  isLatest = true,
}: HistoryRowProps) {
  if (meta) {
    return (
      <View style={styles.stacked}>
        <Text style={styles.stackedMeta}>
          {date} · {meta}
        </Text>
        <Text style={[styles.value, styles.stackedValue]}>{value}</Text>
      </View>
    )
  }

  return (
    <View style={styles.inline}>
      <Text style={styles.date}>{date}</Text>
      <Text style={[styles.value, !isLatest && styles.valueOlder]}>
        {value}
      </Text>
    </View>
  )
}

export function HistoryEmptyRow({ message }: { message: string }) {
  return <Text style={styles.empty}>{message}</Text>
}

const styles = StyleSheet.create({
  inline: {
    alignItems: 'baseline',
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 40,
    paddingVertical: 10,
  },

  date: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 12.5,
    fontVariant: ['tabular-nums'],
    width: 68,
  },

  value: {
    color: colors.textPrimary,
    flex: 1,
    fontFamily: fonts.mono,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },

  valueOlder: {
    color: colors.textSecondary,
  },

  stacked: {
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
    gap: spacing.xs,
    paddingVertical: 13,
  },

  stackedMeta: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 12,
  },

  stackedValue: {
    fontSize: fontSize.data,
  },

  empty: {
    color: colors.textMuted,
    fontSize: fontSize.meta,
    paddingVertical: 10,
  },
})
