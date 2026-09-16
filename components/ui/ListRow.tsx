import { colors, fontSize } from '@/constants/theme'
import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

type ListRowProps = {
  title: string
  meta?: string
  /** Text at the trailing edge; defaults to a chevron. */
  trailing?: string
  leading?: ReactNode
  onPress?: () => void
  disabled?: boolean
  accessibilityHint?: string
}

/** Dense separator row used for exercise lists. */
export function ListRow({
  title,
  meta,
  trailing = '›',
  leading,
  onPress,
  disabled = false,
  accessibilityHint,
}: ListRowProps) {
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled || !onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {leading}

      <View style={styles.body}>
        <Text
          numberOfLines={1}
          style={[styles.title, disabled && styles.titleDisabled]}
        >
          {title}
        </Text>

        {meta ? (
          <Text numberOfLines={1} style={styles.meta}>
            {meta}
          </Text>
        ) : null}
      </View>

      <Text style={[styles.trailing, trailing !== '›' && styles.trailingText]}>
        {trailing}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 52,
    paddingVertical: 10,
  },

  pressed: {
    opacity: 0.6,
  },

  body: {
    flex: 1,
    gap: 2,
  },

  title: {
    color: colors.textPrimary,
    fontSize: 15.5,
    fontWeight: '500',
  },

  titleDisabled: {
    color: colors.textMuted,
  },

  meta: {
    color: colors.textMuted,
    fontSize: fontSize.meta,
  },

  trailing: {
    color: colors.textMuted,
    fontSize: 17,
  },

  trailingText: {
    fontSize: fontSize.meta,
  },
})
