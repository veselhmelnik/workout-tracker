import { colors, fonts } from '@/constants/theme'
import { formatDateBlock } from '@/utils/format'
import { StyleSheet, Text, View } from 'react-native'

/**
 * Wide enough for four- and five-character localised month abbreviations
 * ("SEPT", "СЕНТ.") at label size, so the column beside it stays aligned.
 */
export const DATE_BLOCK_WIDTH = 52

type DateBlockProps = {
  isoDate: string
  /** Older entries step down to secondary text so the newest leads. */
  isMuted?: boolean
}

/** Stacked "18" over "SEP", both taken from the device locale. */
export function DateBlock({ isoDate, isMuted = false }: DateBlockProps) {
  const date = formatDateBlock(isoDate)

  return (
    <View style={styles.block}>
      <Text style={[styles.day, isMuted && styles.dayMuted]}>{date.day}</Text>
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        numberOfLines={1}
        style={styles.month}
      >
        {date.month}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  block: {
    alignItems: 'center',
    width: DATE_BLOCK_WIDTH,
  },

  day: {
    color: colors.textPrimary,
    fontFamily: fonts.mono,
    fontSize: 17,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
    lineHeight: 19,
  },

  dayMuted: {
    color: colors.textSecondary,
  },

  month: {
    color: colors.textMuted,
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
})
