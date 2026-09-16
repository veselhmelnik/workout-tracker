import { colors, fontSize, radius, spacing } from '@/constants/theme'
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native'

/**
 * - primary: off-white fill, for the key action on a screen (Save).
 * - active: amber fill, only for resuming the in-progress session.
 * - secondary: raised graphite, for everyday actions (Start, + Add Exercise).
 * - outline: bordered, lower emphasis than secondary (Skip).
 * - destructive: red text with a restrained border (Archive).
 */
export type ButtonVariant =
  | 'primary'
  | 'active'
  | 'secondary'
  | 'outline'
  | 'destructive'

type ButtonProps = {
  label: string
  onPress: () => void
  variant?: ButtonVariant
  size?: 'regular' | 'compact'
  disabled?: boolean
  busy?: boolean
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'regular',
  disabled = false,
  busy = false,
}: ButtonProps) {
  const isInactive = disabled || busy
  const variantStyle = variantStyles[variant]

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isInactive, busy }}
      disabled={isInactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        size === 'compact' && styles.compact,
        variantStyle.container,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={variantStyle.label.color} size="small" />
      ) : (
        <Text
          numberOfLines={1}
          style={[
            styles.label,
            size === 'compact' && styles.compactLabel,
            variantStyle.label,
            disabled && styles.disabledLabel,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderColor: 'transparent',
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.lg,
  },

  compact: {
    minHeight: 40,
  },

  label: {
    fontSize: fontSize.body,
    fontWeight: '600',
  },

  compactLabel: {
    fontSize: 14,
  },

  pressed: {
    opacity: 0.75,
  },

  disabled: {
    backgroundColor: colors.disabledFill,
    borderColor: colors.disabledFill,
  },

  disabledLabel: {
    color: colors.disabledText,
  },
})

const variantStyles = {
  primary: StyleSheet.create({
    container: { backgroundColor: colors.primary },
    label: { color: colors.onPrimary },
  }),

  active: StyleSheet.create({
    container: { backgroundColor: colors.active },
    label: { color: colors.onActive },
  }),

  secondary: StyleSheet.create({
    container: {
      backgroundColor: colors.elevated,
      borderColor: colors.border,
    },
    label: { color: colors.textPrimary },
  }),

  outline: StyleSheet.create({
    container: {
      backgroundColor: 'transparent',
      borderColor: colors.border,
    },
    label: { color: colors.textSecondary },
  }),

  destructive: StyleSheet.create({
    container: {
      backgroundColor: 'transparent',
      borderColor: colors.destructiveBorder,
    },
    label: { color: colors.destructive },
  }),
} satisfies Record<
  ButtonVariant,
  { container: object; label: { color: string } }
>
